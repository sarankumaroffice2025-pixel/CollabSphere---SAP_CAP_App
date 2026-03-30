import cds from "@sap/cds";
import { Request, Service } from "@sap/cds";
import { Readable } from "node:stream";

export default class collabSphereService extends cds.ApplicationService {
  async init(): Promise<void> {
    // action to Create the Employee Details
    this.on(
      "createEmployeeDetails",
      this.handleCreateEmployeeDetails.bind(this),
    );

    //action to get the Employee Details
    this.on(
      "accessEmployeeDetails",
      this.handleAccessEmployeeDetails.bind(this),
    );

    //action to Update the Employee Details
    (this.on(
      "editEmployeeDetails",
      this.handleUpdateEmployeeDetails.bind(this),
    ),
      //action to delete the Employee Details
      this.on(
        "deleteEmployeeDetails",
        this.handleDeleteEmployeeDetails.bind(this),
      ));

    await super.init();
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  private async handleCreateEmployeeDetails(req: Request) {
    const db = cds.connect.to("db");
    const { Employee, Asset, Attachment } = (await db).entities;
    const user = req.user;
    try {
      const { firstName, lastName, email, position, resume } = req.data.data;
      if (
        !firstName ||
        !lastName ||
        !email ||
        !position ||
        !resume ||
        resume.length < 0
      ) {
        return req.reject(400, `Missing Employee Details`);
      }
      console.log(`User Details ::: ${JSON.stringify(req.user)}`);
      let userName = email;

      const existingUser = await SELECT.from(Employee).where({ email: email });

      console.log(`Existing User ::: ${JSON.stringify(existingUser)}`);

      if (existingUser.length > 0) {
        return req.reject(409, `Employee Already exists`);
      }

      let creatorName, modifierName;
      const [currentUser] = await SELECT.from(Employee).where({
        email: req.user.id,
      });
      if (!currentUser) {
        creatorName = req.user.id;
        modifierName = req.user.id;
      } else {
        creatorName = currentUser?.fullName;
        modifierName = currentUser?.fullName;
      }

      let fullName = `${firstName.trim()} ${lastName.trim()}`;
      const [result] = await INSERT.into(Employee).entries({
        userName,
        firstName,
        lastName,
        fullName,
        email,
        position,
        isActive: 1,
        creatorName,
        modifierName,
      });

      if (!result) {
        throw new Error(
          `Failed to Upload the Employee Details in Employee Table`,
        );
      }
      console.log(`Employee ID ::: ${result?.ID}`);
      const [assetResult] = await INSERT.into(Asset).entries({
        assetid: result?.ID,
        assetType: "employeeResume",
        creatorName: creatorName,
        modifierName: modifierName,
      });
      if (!assetResult) {
        throw new Error(`Failed to Upload the Employee Asset in Asset Table`);
      }
      console.log(`Asset ID ::: ${assetResult.ID}`);
      for (const attachment of resume) {
        if (
          !attachment.fileName ||
          !attachment.mediaType ||
          !attachment.file ||
          !attachment.fileSize
        ) {
          return req.reject(400, `Missing Attachment Details`);
        }
        const [attachmentResult] = await INSERT.into(Attachment).entries({
          fileName: attachment.fileName,
          mediaType: attachment.mediaType,
          file: Buffer.from(attachment.file, "base64"),
          fileSize: attachment.fileSize,
          attachmentAsset_ID: assetResult?.ID,
        });
        if (!attachmentResult) {
          throw new Error(
            `Failed to Upload the Employee Attachment in Attachment Table`,
          );
        }
        console.log(
          `Attachment result ::: ${JSON.stringify(await SELECT.from(Attachment).where({ ID: attachmentResult.ID }))}`,
        );
      }

      return {
        ID: result?.ID,
        creationStatus: true,
      };
    } catch (error: any) {
      console.log(`Failed to Create the Employee Details ::: ${error.message}`);
      return req.reject(
        500,
        `Failed to Create the Employee Details ::: ${error.message}`,
      );
    }
  }

  private async handleAccessEmployeeDetails(req: Request) {
    const db = await cds.connect.to("db");
    const { Employee, Asset, Attachment } = db.entities;
    try {
      const { ID } = req.data;
      if (!ID) {
        return req.reject(400, `Missing Employee ID`);
      }
      const [existingEmployee] = await SELECT.from(Employee).where({ ID: ID });

      if (!existingEmployee) {
        return req.reject(404, `Employee Not Found`);
      }
      const [existingAsset] = await SELECT.from(Asset).where({ assetid: ID });

      if (!existingAsset) {
        return req.reject(404, `Asset Not Found for the Employee`);
      }
      const [existingAttachment] = await SELECT.from(Attachment)
        .columns("fileName", "file", "fileSize", "mediaType")
        .where({
          attachmentAsset_ID: existingAsset.ID,
        });
      if (!existingAttachment) {
        return req.reject(404, `Attachment not Found for the Employee`);
      }
      console.log(
        `Existing Attachment ::: ${JSON.stringify(existingAttachment)}`,
      );
      const buffer = await this.streamToBuffer(existingAttachment.file);
      const file = buffer.toString("base64");
      return {
        ID: ID,
        userName: existingEmployee.userName,
        firstName: existingEmployee.firstName,
        lastName: existingEmployee.lastName,
        fullName: existingEmployee.fullName,
        email: existingEmployee.email,
        position: existingEmployee.position,
        isActive: existingEmployee.isActive,
        resume: {
          fileName: existingAttachment.fileName,
          mediaType: existingAttachment.mediaType,
          file: file,
          fileSize: existingAttachment.fileSize,
        },
      };
    } catch (error: any) {
      console.log(`Failed To get the Employee Details ::: ${error.message}`);
      return req.reject(
        500,
        `Failed To get the Employee Details ::: ${error.message}`,
      );
    }
  }

  private async handleUpdateEmployeeDetails(req: Request) {
    const db = await cds.connect("db");
    const { Employee, Asset, Attachment } = db.entities;
    const user = req.user;
    try {
      const { ID, firstName, lastName, email, position, resume } =
        req.data.data;
      if (!ID) {
        return req.reject(400, `Missing ID Detils`);
      }
      const [existingUser] = await SELECT.from(Employee).where({ ID: ID });
      if (!existingUser) {
        return req.reject(404, `Employee Not Found`);
      }

      if (
        !firstName ||
        !lastName ||
        !email ||
        !position ||
        !resume ||
        resume.length < 0
      ) {
        return req.reject(400, `Missing Update Data`);
      }
      let modifierName;
      const [modifier] = await SELECT.from(Employee).where({ email: req.id });
      if (!modifier) {
        modifierName = req.user.id;
      } else {
        modifierName = modifier?.fullName;
      }
      await UPDATE(Employee).set({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        email: email,
        position: position,
        isActive: 1,
        modifierName: modifierName,
      });

      const [existingAsset] = await SELECT.from(Asset).where({ assetid: ID });
      console.log(`Existing Asset ::: ${JSON.stringify(existingAsset)}`);
      if (!existingAsset) {
        return req.reject(404, `Asset not Found for the Employee`);
      }
      const [existingAttachment] = await SELECT.from(Attachment).where({
        attachmentAsset_ID: existingAsset.ID,
      });
      if (!existingAttachment) {
        return req.reject(404, `Attachment Not found for the Asset`);
      }
      for (const attachment of resume) {
        if (
          !attachment.fileName ||
          !attachment.mediaType ||
          !attachment.file ||
          !attachment.fileSize
        ) {
          return req.reject(400, `Missing Attachment Details`);
        }
        await UPDATE(Attachment)
          .set({
            fileNAme: attachment.fileName,
            mediaType: attachment.mediaType,
            file: Buffer.from(attachment.file, "base64"),
            fileSize: attachment.fileSize,
          })
          .where({ attachmentAsset_ID: existingAsset.ID });
      }
      return {
        ID: ID,
        updateStatus: true,
      };
    } catch (error: any) {
      console.log(`Failed to Update the Employee Details ::: ${error.message}`);
      return req.reject(
        500,
        `Failed to Update the Employee Details ::: ${error.message}`,
      );
    }
  }

  private async handleDeleteEmployeeDetails(req: Request) {
    const db = await cds.connect.to("db");
    const { Employee } = db.entities;
    const user = req.user;
    try {
      const { ID } = req.data;
      if (!ID) {
        return req.reject(400, `Missing Employee ID`);
      }
      const [existingEmployee] = await SELECT.from(Employee).where({ ID: ID });
      if (!existingEmployee) {
        return req.reject(404, `Employee Not Found`);
      }

      let modifierName;
      const [modifier] = await SELECT.from(Employee).where({ email: req.id });
      if (!modifier) {
        modifierName = req.user.id;
      } else {
        modifierName = modifier?.fullName;
      }
      await UPDATE(Employee).set({
        isActive: 0,
        modifierName: modifierName,
      });

      return {
        deletionStatus: true,
      };
    } catch (error: any) {
      console.log(`Failed to Delete the Employee Details ::: ${error.message}`);
      return req.reject(
        500,
        `Failed to Delete the Employee Details ::: ${error.message}`,
      );
    }
  }
}
