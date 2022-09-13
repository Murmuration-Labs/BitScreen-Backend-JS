import {MigrationInterface, QueryRunner} from "typeorm";

export class PostRefactoring1663010251051 implements MigrationInterface {
    name = 'PostRefactoring1663010251051'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          `CREATE TABLE "assessor"
            (
              "created" TIMESTAMP NOT NULL,
              "updated" TIMESTAMP,
              "id" SERIAL NOT NULL,
              "walletAddressHashed" character varying,
              "nonce" character varying,
              "rodeoConsentDate" character varying,
              "lastUpdate" TIMESTAMP,
              "providerId" integer,
              CONSTRAINT "REL_6479b0bff06d222f742700b56d" UNIQUE ("providerId"),
              CONSTRAINT "PK_8c9195f3f6d77e4c10fce8e2bdf" PRIMARY KEY ("id"))`);

        await queryRunner.query(
          `INSERT INTO "assessor" as a ("providerId", "rodeoConsentDate", "created")
           SELECT "id", "rodeoConsentDate", p."created" FROM provider as p
           WHERE EXISTS (SELECT "assessorId" FROM "complaint" AS c WHERE "assessorId" = p.id)`);

        await queryRunner.query(`ALTER TABLE "complaint" DROP CONSTRAINT "FK_adb6368f5f1fab788d63cef9197"`);
        await queryRunner.query(`ALTER TABLE "provider" DROP COLUMN "rodeoConsentDate"`);
        await queryRunner.query(`ALTER TABLE "complaint" ADD CONSTRAINT "FK_adb6368f5f1fab788d63cef9197" FOREIGN KEY ("assessorId") REFERENCES "assessor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assessor" ADD CONSTRAINT "FK_6479b0bff06d222f742700b56d2" FOREIGN KEY ("providerId") REFERENCES "provider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "assessor" DROP CONSTRAINT "FK_6479b0bff06d222f742700b56d2"`);
        await queryRunner.query(`ALTER TABLE "complaint" DROP CONSTRAINT "FK_adb6368f5f1fab788d63cef9197"`);
        await queryRunner.query(`ALTER TABLE "provider" ADD "rodeoConsentDate" character varying`);
        await queryRunner.query(`DROP TABLE "assessor"`);
        await queryRunner.query(`ALTER TABLE "complaint" ADD CONSTRAINT "FK_adb6368f5f1fab788d63cef9197" FOREIGN KEY ("assessorId") REFERENCES "provider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
