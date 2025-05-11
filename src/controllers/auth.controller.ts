import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const signup = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password, full_name, avatar_url } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name,
                    avatar_url
                }
            }
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(201).json({
            message: 'Signup successful',
            user: data.user
        });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({ error: error.message });
        }

        return res.status(200).json({
            message: 'Login successful',
            session: data.session,
            user: data.user
        });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};