-- AlterTable: Add before_photo_url and after_photo_url nullable columns to Order
-- PHO-01: on-site before photo R2 key
-- PHO-02: on-site after photo R2 key
ALTER TABLE "Order" ADD COLUMN "before_photo_url" TEXT;
ALTER TABLE "Order" ADD COLUMN "after_photo_url" TEXT;
