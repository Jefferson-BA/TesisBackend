import { MigrationInterface, QueryRunner } from "typeorm";

export class InitMigration1792952844149 implements MigrationInterface {
    name = 'InitMigration1792952844149'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "description" text, "price" numeric(10,2) NOT NULL, "isAvailable" boolean NOT NULL DEFAULT true, "imageUrl" character varying, "isActive" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "category_id" uuid, CONSTRAINT "UQ_4c9fb58de893725258746385e16" UNIQUE ("name"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4c9fb58de893725258746385e1" ON "products" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_9a5f6868c96e0069e699f33e12" ON "products" ("category_id") `);
        await queryRunner.query(`CREATE TABLE "order_items" ("id" SERIAL NOT NULL, "orderId" integer NOT NULL, "productId" uuid NOT NULL, "quantity" integer NOT NULL, "price" numeric(10,2) NOT NULL, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "reservation_items" ("id" SERIAL NOT NULL, "reservationId" integer NOT NULL, "productId" uuid NOT NULL, "quantity" integer NOT NULL, "price" numeric(10,2) NOT NULL, CONSTRAINT "PK_bfc06fb7312bf99dd93bbe73844" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."reservations_status_enum" AS ENUM('pending_review', 'approved', 'fully_paid', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "reservations" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "eventDate" date NOT NULL, "serviceStartTime" character varying(50) NOT NULL, "guestsCount" integer NOT NULL, "venueAddress" character varying(255) NOT NULL, "city" character varying(100) NOT NULL, "additionalNotes" text, "termsAcceptedAt" TIMESTAMP WITH TIME ZONE, "privacyAcceptedAt" TIMESTAMP WITH TIME ZONE, "totalAmount" numeric(10,2) NOT NULL, "status" "public"."reservations_status_enum" NOT NULL DEFAULT 'pending_review', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'paid', 'failed', 'shipped', 'delivered', 'cancelled')`);
        await queryRunner.query(`CREATE TYPE "public"."orders_paymentmethod_enum" AS ENUM('card', 'yape', 'plin', 'cash')`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "totalAmount" numeric(10,2) NOT NULL, "shippingAddress" character varying(255) NOT NULL, "city" character varying(100), "postalCode" character varying(20), "phone" character varying(20), "status" "public"."orders_status_enum" NOT NULL DEFAULT 'pending', "paymentMethod" "public"."orders_paymentmethod_enum" NOT NULL DEFAULT 'card', "reservationId" integer, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_151b79a83ba240b0cb31b2302d" ON "orders" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_775c9f06fc27ae3ff8fb26f2c4" ON "orders" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_1f4b9818a08b822a31493fdee9" ON "orders" ("createdAt") `);
        await queryRunner.query(`CREATE TABLE "cart_items" ("id" SERIAL NOT NULL, "quantity" integer NOT NULL DEFAULT '1', "cartId" integer, "productId" uuid, CONSTRAINT "PK_6fccf5ec03c172d27a28a82928b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "carts" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, CONSTRAINT "REL_69828a178f152f157dcf2f70a8" UNIQUE ("userId"), CONSTRAINT "PK_b5f695a59f5ebb50af3c8160816" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "profileImage" character varying, "phone" character varying, "address" character varying, "termsAcceptedAt" TIMESTAMP WITH TIME ZONE, "privacyAcceptedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "role_id" integer NOT NULL, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE INDEX "IDX_409a0298fdd86a6495e23c25c6" ON "users" ("isActive") `);
        await queryRunner.query(`CREATE TYPE "public"."roles_name_enum" AS ENUM('superadmin', 'admin', 'user')`);
        await queryRunner.query(`CREATE TABLE "roles" ("id" SERIAL NOT NULL, "name" "public"."roles_name_enum" NOT NULL, "description" text, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."promotions_discounttype_enum" AS ENUM('percentage', 'fixed_amount', 'buy_x_get_discount')`);
        await queryRunner.query(`CREATE TYPE "public"."promotions_applyto_enum" AS ENUM('product', 'category', 'all')`);
        await queryRunner.query(`CREATE TABLE "promotions" ("id" SERIAL NOT NULL, "title" character varying(150) NOT NULL, "description" text NOT NULL, "imageUrl" character varying, "discountType" "public"."promotions_discounttype_enum" NOT NULL DEFAULT 'percentage', "discountValue" numeric(10,2) NOT NULL, "minQuantity" integer, "applyTo" "public"."promotions_applyto_enum" NOT NULL DEFAULT 'all', "productId" uuid, "categoryId" uuid, "startDate" date NOT NULL, "endDate" date NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_380cecbbe3ac11f0e5a7c452c34" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" SERIAL NOT NULL, "token" text NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "ipAddress" character varying, "userAgent" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_cdb99c05982d5191ac8465ac010" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservation_items" ADD CONSTRAINT "FK_47258d2fccc530c4da433a09722" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservation_items" ADD CONSTRAINT "FK_0f75743d435896a243ff0cf04e1" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "FK_aa0e1cc2c4f54da32bf8282154c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_ee6291f91f6b5ce967d7cbd3875" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cart_items" ADD CONSTRAINT "FK_edd714311619a5ad09525045838" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cart_items" ADD CONSTRAINT "FK_72679d98b31c737937b8932ebe6" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "carts" ADD CONSTRAINT "FK_69828a178f152f157dcf2f70a89" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promotions" ADD CONSTRAINT "FK_c8147b5d9ff0dfa7e37be56c1ba" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promotions" ADD CONSTRAINT "FK_4a454934d715cd3ca29ab675349" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`);
        await queryRunner.query(`ALTER TABLE "promotions" DROP CONSTRAINT "FK_4a454934d715cd3ca29ab675349"`);
        await queryRunner.query(`ALTER TABLE "promotions" DROP CONSTRAINT "FK_c8147b5d9ff0dfa7e37be56c1ba"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`);
        await queryRunner.query(`ALTER TABLE "carts" DROP CONSTRAINT "FK_69828a178f152f157dcf2f70a89"`);
        await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_72679d98b31c737937b8932ebe6"`);
        await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_edd714311619a5ad09525045838"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_ee6291f91f6b5ce967d7cbd3875"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_aa0e1cc2c4f54da32bf8282154c"`);
        await queryRunner.query(`ALTER TABLE "reservation_items" DROP CONSTRAINT "FK_0f75743d435896a243ff0cf04e1"`);
        await queryRunner.query(`ALTER TABLE "reservation_items" DROP CONSTRAINT "FK_47258d2fccc530c4da433a09722"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_cdb99c05982d5191ac8465ac010"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
        await queryRunner.query(`DROP TABLE "promotions"`);
        await queryRunner.query(`DROP TYPE "public"."promotions_applyto_enum"`);
        await queryRunner.query(`DROP TYPE "public"."promotions_discounttype_enum"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TYPE "public"."roles_name_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_409a0298fdd86a6495e23c25c6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "carts"`);
        await queryRunner.query(`DROP TABLE "cart_items"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1f4b9818a08b822a31493fdee9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_775c9f06fc27ae3ff8fb26f2c4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_151b79a83ba240b0cb31b2302d"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_paymentmethod_enum"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`DROP TABLE "reservations"`);
        await queryRunner.query(`DROP TYPE "public"."reservations_status_enum"`);
        await queryRunner.query(`DROP TABLE "reservation_items"`);
        await queryRunner.query(`DROP TABLE "order_items"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9a5f6868c96e0069e699f33e12"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4c9fb58de893725258746385e1"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TABLE "categories"`);
    }

}
