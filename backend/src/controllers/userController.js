import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import createHttpError from 'http-errors';
import supabase from '../config/db.js';

export const registerUser = async (email, password, nameFirst, nameLast) => {
  // checks if fields are provided
  if (!email || !password || !nameFirst || !nameLast) {
    throw createHttpError(400, 'All fields are required');
  }

  try {
    // check if user exists
    const { data: existingUser, error: findError } = await supabase
      .from('user')
      .select('*')
      .eq('email', email)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      throw createHttpError(500, 'Database error while checking existing user');
    }

    if (existingUser) {
      throw createHttpError(400, 'User already exists');
    }

    // hash pw
    const hashedPW = await bcrypt.hash(password, 10);

    // insert new user into supabase
    const { data: user, error: insertError } = await supabase
      .from('user')
      .insert([{ email, password: hashedPW, nameFirst, nameLast }])
      .select();

    if (insertError) {
      throw createHttpError(500, 'Error creating user in database');
    }

    // create JWT token
    const token = jwt.sign(
      { email: user.email,
        nameFirst: user.givenName, 
        nameLast: user.familyName 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } //optional
    );

    return { token: token };
    
  } catch (error) {
    if (!error.status) {
      throw createHttpError(500, 'Unexpected server error' + error);
    }
    throw error; 
  }
};

export const loginUser = async (email, password) => {
  // checks if fields are provided
  if (!email || !password) {
    throw createHttpError(400, 'All fields are required');
  }

  try {
     // find user by email
     const { data: user, error: findError } = await supabase
      .from('user')
      .select('*')
      .eq('email', email)
      .single();

      // error handling
      if (!user) {
        throw createHttpError(401, 'User not found');
      }

      if (findError) {
        throw createHttpError(500, 'Database error');
      }

      // compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw createHttpError(401, 'Invalid email or password');
      }

      if (!process.env.JWT_SECRET) {
        throw createHttpError(500, 'Server configuration error');
      }

      // create JWT token
      const token = jwt.sign(
        { email: user.email,
          nameFirst: user.givenName, 
          nameLast: user.familyName 
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' } //optional
      );

    return { token: token };

  } catch (error) {
    if (!error.status) {
      throw createHttpError(500, 'Unexpected server error' + error);
    }
    throw error; 
  }
};