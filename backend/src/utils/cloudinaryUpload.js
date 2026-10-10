import { v2 as cloudinary } from "cloudinary";

// Streams an in-memory buffer (multer memoryStorage) to Cloudinary.
export const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (result) resolve(result);
      else reject(error);
    });
    stream.end(buffer);
  });

export default uploadBuffer;
