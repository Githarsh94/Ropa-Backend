import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import { env } from '../config/env.config';
import { supabase } from '../config/supabase';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// Configure multer for file upload
const storage = multer.memoryStorage();
export const upload = multer({ storage: storage });

const findOrCreate = async (table: string, matchField: string, matchValue: any, data: any) => {
    try {
        // First try to find existing record
        const { data: existingData, error: selectError } = await supabase
            .from(table)
            .select('*')
            .eq(matchField, matchValue);

        if (selectError) {
            throw selectError;
        }

        // If record exists, return the first one
        if (existingData && existingData.length > 0) {
            console.log(`Found existing ${table} with ${matchField}:`, matchValue);
            return { id: existingData[0].id, created: false };
        }

        // If no record exists, create new one
        const { data: createdData, error: insertError } = await supabase
            .from(table)
            .insert(data)
            .select('*');

        if (insertError) {
            throw insertError;
        }

        if (!createdData || createdData.length === 0) {
            throw new Error(`Failed to create record in ${table}`);
        }

        console.log(`Created new ${table} with ${matchField}:`, matchValue);
        return { id: createdData[0].id, created: true };
    } catch (error: any) {
        console.error(`Error finding or creating in ${table}:`, error);
        throw error;
    }
};

export const analyzeImage = async (req: Request | any, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No image file provided' });
            return;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const imageBase64 = req.file.buffer.toString('base64');

        const prompt = `Analyze the provided image of a fashion product. Identify as much information as possible about the product, aiming to populate the fields of the following database tables. Return your findings as a single JSON object where the keys correspond to the table names, and the values are arrays of objects representing potential rows for those tables.

**Target Tables and Fields:**

* **products:** (Try to infer these from the image)
    * \`name\`: A descriptive name for the product.
    * \`product_type\`: e.g., "Top", "Bottom", "Dress", "Shoe", "Bag".
    * \`category\`: e.g., "Clothing", "Footwear", "Accessories".
    * \`subcategory\`: e.g., "T-shirt", "Jeans", "Sandals", "Tote Bag".
    * \`gender\`: e.g., "Female", "Male", "Unisex", "Kids".
    * \`target_age_group\`: e.g., "Adult", "Teen", "Child", "Infant".
    * \`description\`: A brief description of the product's key features.
    * \`tags\`: A comma-separated list of relevant keywords for search.

* **brands:** (If the brand is clearly visible or recognizable)
    * \`name\`: The name of the brand.

* **collections:** (If the product seems to belong to a specific, recognizable collection - this is less likely from a single image but try if possible)
    * \`name\`: The name of the collection.

* **colors:** (Identify all visible colors)
    * \`name\`: The common name of the color (e.g., "Red", "Navy Blue", "Black", "White", "Multicolor").

* **sizes:** (If any size information is visible - e.g., on a tag)
    * \`name\`: The size (e.g., "S", "M", "L", "US 6", "EU 38").

* **attributes:** (Identify various attributes of the product)
    * \`name\`: A descriptive term for the feature you observe (e.g., "Neckline", "Sleeve Length", "Material", "Pattern", "Closure Type", "Heel Height", "Bag Style", "Gemstone Type", "Fit", "Occasion").
    * \`value\`: The specific value you perceive for that attribute in the image (e.g., "V-Neck", "Long Sleeves", "Cotton", "Striped", "Zipper", "Stiletto", "Crossbody", "Diamond", "Relaxed", "Casual").

For each identified piece of information (for any of the tables), please include a \`value\` and a \`confidence_score\` (a number between 0.00 and 1.00) indicating your certainty. If you cannot confidently identify a piece of information for a specific field, you can omit that field from the output for that particular table or provide a very low confidence score.

**Output Format:**

\`\`\`json
{
  "products": [
    {
      "name": "Elegant Sleeveless Evening Gown",
      "confidence_score": 0.75
    },
    {
      "product_type": "Dress",
      "confidence_score": 0.98
    },
    {
      "category": "Clothing",
      "confidence_score": 0.99
    },
    {
      "subcategory": "Evening Dress",
      "confidence_score": 0.85
    },
    {
      "gender": "Female",
      "confidence_score": 0.97
    },
    {
      "target_age_group": "Adult",
      "confidence_score": 0.92
    },
    {
      "description": "A floor-length sleeveless evening gown with a sweetheart neckline and sequin embellishments.",
      "confidence_score": 0.70
    },
    {
      "tags": "evening gown, formal, sleeveless, sequin, elegant",
      "confidence_score": 0.80
    }
  ],
  "brands": [
    {
      "name": "Luxury Designs",
      "confidence_score": 0.55
    }
  ],
  "collections": [],
  "colors": [
    {
      "name": "Silver",
      "confidence_score": 0.96
    },
    {
      "name": "Gray",
      "confidence_score": 0.88
    }
  ],
  "sizes": [
    {
      "name": "US 10",
      "confidence_score": 0.60
    }
  ],
  "attributes": [
    {
      "name": "Neckline",
      "value": "Sweetheart",
      "confidence_score": 0.94
    },
    {
      "name": "Sleeve Length",
      "value": "Sleeveless",
      "confidence_score": 0.99
    },
    {
      "name": "Material",
      "value": "Polyester",
      "confidence_score": 0.80
    },
    {
      "name": "Embellishment",
      "value": "Sequins",
      "confidence_score": 0.90
    },
     {
      "name": "Dress Length",
      "value": "Floor-Length",
      "confidence_score": 0.95
    },
    {
      "name": "Occasion",
      "value": "Formal",
      "confidence_score": 0.92
    }
  ]
}
provide valide JSON Response only.
\`\`\`
`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: req.file.mimetype,
                    data: imageBase64,
                },
            },
        ]);

        const response = result.response;
        let text = response.text();
        text = text.replace(/^```(?:json)?|```$/g, '').trim();
        console.log("LLM Response: ", text);
        const llmResponse = JSON.parse(text);

        res.status(200).json(llmResponse);
    } catch (error: any) {
        console.error('Error analyzing image:', error);
        res.status(500).json({ error: 'Failed to analyze image', detailedError: error.message });
    }
};

export const storeProductData = async (req: Request | any, res: Response): Promise<void> => {
    try {
        const data = JSON.parse(req.body.data);
        console.log("Data: ", data);
        const userId = req.user?.id;
        const imageFile = req.file;

        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }

        // Upload image to Supabase storage
        let imageUrl = '';
        if (imageFile) {
            const fileName = `${userId}_${Date.now()}.${imageFile.originalname.split('.').pop()}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('product-files')
                .upload(fileName, imageFile.buffer, {
                    contentType: imageFile.mimetype,
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('product-files')
                .getPublicUrl(fileName);

            imageUrl = publicUrl;
        }

        let productId: number | undefined;

        // [Previous vendor processing code remains the same]
        const vendorName = "Unknown Vendor";
        const { id: vendorId } = await findOrCreate('vendors', 'name', vendorName, {
            name: vendorName,
            contact_person: '',
            email: '',
            phone_number: '',
            address: '',
        });

        // [Previous brands processing code remains the same]
        let brandId: number | undefined;
        if (data.brands && data.brands.length > 0) {
            const brandData = data.brands[0];
            const result = await findOrCreate('brands', 'name', brandData.name, {
                name: brandData.name,
                description: '',
                logo_url: '',
                website_url: '',
                country_of_origin: '',
            });
            brandId = result.id;
        }

        // [Previous collections processing code remains the same]
        let collectionId: number | undefined;
        if (data.collections && data.collections.length > 0) {
            const collectionData = data.collections[0];
            const result = await findOrCreate('collections', 'name', collectionData.name, {
                name: collectionData.name,
                description: '',
                season: '',
                launch_date: null,
                image_url: '',
            });
            collectionId = result.id;
        }

        // Update products processing to include image_url
        if (data.products && data.products.length > 0) {
            const productData = data.products.reduce((acc: any, curr: any) => {
                if (curr.name) acc.name = curr.name;
                if (curr.product_type) acc.product_type = curr.product_type;
                if (curr.category) acc.category = curr.category;
                if (curr.subcategory) acc.subcategory = curr.subcategory;
                if (curr.gender) acc.gender = curr.gender;
                if (curr.target_age_group) acc.target_age_group = curr.target_age_group;
                if (curr.description) acc.description = curr.description;
                if (curr.tags) acc.tags = curr.tags;
                return acc;
            }, {});

            const { data: product, error: productError } = await supabase
                .from('products')
                .insert({
                    ...productData,
                    vendor_id: vendorId,
                    brand_id: brandId,
                    collection_id: collectionId,
                    user_id: userId,
                    image_url: imageUrl, // Add the image URL here
                })
                .select()
                .single();

            if (productError) throw productError;
            productId = product.id;
        } else {
            const { data: product, error: productError } = await supabase
                .from('products')
                .insert({
                    name: "Unnamed Product",
                    product_type: "Unknown",
                    category: "Unknown",
                    vendor_id: vendorId,
                    brand_id: brandId,
                    collection_id: collectionId,
                    user_id: userId,
                    image_url: imageUrl, // Add the image URL here
                })
                .select()
                .single();

            if (productError) throw productError;
            productId = product.id;
        }

        // [Rest of the processing code remains the same]
        // [Colors, Sizes, and Attributes processing...]

        res.status(200).json({ message: 'Product data stored successfully', productId, imageUrl });
    } catch (error: any) {
        console.error('Error storing product data:', error);
        res.status(500).json({ error: 'Failed to store product data', detailedError: error.message });
    }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
    try {
        const productId = req.params.id;
        console.log("Product ID: ", productId);
        if (!productId) {
            res.status(400).json({ error: 'Invalid product ID' });
            return;
        }

        const { data: product, error } = await supabase
            .from('products')
            .select(`
                *,
                brand: brands(*),
                vendor: vendors(*),
                collection: collections(*),
                colors: product_colors(*, color:colors(*)),
                sizes: product_sizes(*, size:sizes(*)),
                attributes: product_attributes(
                    *,
                    attribute:attributes(*),
                    attribute_value:attribute_values(*)
                )
            `)
            .eq('id', productId)
            .single();

        if (error) throw error;
        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        res.status(200).json(product);
    } catch (error: any) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product', detailedError: error.message });
    }
};


export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                *,
                brand: brands(*),
                vendor: vendors(*),
                collection: collections(*),
                colors: product_colors(*, color:colors(*)),
                sizes: product_sizes(*, size:sizes(*)),
                attributes: product_attributes(
                    *,
                    attribute:attributes(*),
                    attribute_value:attribute_values(*)
                )
            `);

        if (error) {
            throw error;
        }

        res.status(200).json(products);
    } catch (error: any) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products', detailedError: error.message });
    }
};
