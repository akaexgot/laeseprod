import { config } from 'dotenv';
config();

const requiredEnv = [
    'PUBLIC_CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    process.exitCode = 1;
}
