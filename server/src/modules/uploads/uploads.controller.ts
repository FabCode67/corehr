import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { ApiConsumes, ApiTags } from "@nestjs/swagger"

import { UploadsService } from "./uploads.service"

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  // Added for the Professional Profile module's Document Upload spec (PDF/
  // JPG/PNG/DOC/DOCX) — education/certification certificates can now be
  // Word documents, not just PDFs/images.
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])

// Whitelisted so the Cloudinary folder path can't be influenced by
// arbitrary client input.
const ALLOWED_FOLDERS = new Set([
  "profile-pictures",
  "certificates",
  "leave-attachments",
  "onboarding-documents",
  "professional-profile",
])

@ApiTags("Uploads")
@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  async upload(@UploadedFile() file: Express.Multer.File, @Query("folder") folder?: string) {
    if (!file) {
      throw new BadRequestException("No file uploaded.")
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("Unsupported file type. Use JPEG, PNG, WebP, PDF, DOC, or DOCX.")
    }

    const safeFolder = folder && ALLOWED_FOLDERS.has(folder) ? folder : "misc"
    const result = await this.uploadsService.upload(file, safeFolder)

    return { url: result.secure_url, publicId: result.public_id }
  }
}
