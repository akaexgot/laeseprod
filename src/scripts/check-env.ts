import { config } from 'dotenv';
config();
console.log('PUBLIC_CLOUDINARY_CLOUD_NAME:', process.env.PUBLIC_CLOUDINARY_CLOUD_NAME ? 'OK' : 'MISSING');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'OK' : 'MISSING');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'OK' : 'MISSING');
