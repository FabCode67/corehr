import { Injectable, InternalServerErrorException } from "@nestjs/common"
import { v2 as cloudinary, UploadApiResponse } from "cloudinary"

/**
 * Thin wrapper around the Cloudinary SDK, used by profile-picture (Step 1)
 * and certificate (Step 5) uploads in the Employee Registration wizard.
 * Local-disk storage was the fallback option if no object storage was
 * available — Cloudinary credentials were supplied instead, so uploads go
 * straight there and only the resulting secure URL is persisted on the
 * Employee/EmployeeEducation rows.
 */
@Injectable()
export class UploadsService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
  }

  upload(file: Express.Multer.File, folder: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `ncba-rwanda-peoplesuite/${folder}`,
          resource_type: "auto", // covers both images and PDF certificates
        },
        (error, result) => {
          if (error || !result) {
            reject(
              error instanceof Error
                ? error
                : new InternalServerErrorException("Cloudinary upload failed.")
            )
            return
          }
          resolve(result)
        }
      )
      uploadStream.end(file.buffer)
    })
  }
}
