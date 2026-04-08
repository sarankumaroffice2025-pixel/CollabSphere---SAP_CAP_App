import cds from "@sap/cds";
import { Request } from "@sap/cds";
import { Readable } from "node:stream";
import * as xsenv from "@sap/xsenv";
import nodemailer from "nodemailer";

xsenv.loadEnv();

interface AttachmentInput {
  fileName: string;
  mediaType: string;
  file: string;
  fileSize: number;
}

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

    //action tp send the mail for any action
    this.on("sendMail", this.handleSendMail.bind(this));

    // action to Create the Corporate Details
    this.on("createCorporate", this.handleCreateCorporate.bind(this));

    //action to update the Corporate Details
    this.on("updateCorporate", this.handleUpdateCorporate.bind(this));

    // action to Create the Client Details
    this.on("createClient", this.handleCreateClient.bind(this));

    //action to update the Client Details
    this.on("updateClient", this.handleUpdateClient.bind(this));

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
    try {
      const {
        firstName,
        lastName,
        email,
        position,
        resume,
        profile,
        profileMediaType,
      } = req.data.data;
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
      const userName = email;

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

      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const employeeData: Record<string, unknown> = {
        userName,
        firstName,
        lastName,
        fullName,
        email,
        position,
        isActive: 1,
        creatorName,
        modifierName,
      };
      if (profile && profileMediaType) {
        employeeData.profile = Buffer.from(profile, "base64");
        employeeData.profileMediaType = profileMediaType;
      }
      const [result] = await INSERT.into(Employee).entries(employeeData);

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Create the Employee Details ::: ${message}`);
      return req.reject(
        500,
        `Failed to Create the Employee Details ::: ${message}`,
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

      let profileBase64: string | null = null;
      if (existingEmployee.profile) {
        const profileBuffer = await this.streamToBuffer(
          existingEmployee.profile,
        );
        profileBase64 = profileBuffer.toString("base64");
      }

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
        profile: profileBase64,
        profileMediaType: existingEmployee.profileMediaType ?? null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed To get the Employee Details ::: ${message}`);
      return req.reject(
        500,
        `Failed To get the Employee Details ::: ${message}`,
      );
    }
  }

  private async handleUpdateEmployeeDetails(req: Request) {
    const db = await cds.connect("db");
    const { Employee, Asset, Attachment } = db.entities;
    try {
      const {
        ID,
        firstName,
        lastName,
        email,
        position,
        resume,
        profile,
        profileMediaType,
      } = req.data.data;
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
      const updateData: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        email: email,
        position: position,
        isActive: 1,
        modifierName: modifierName,
      };
      if (profile && profileMediaType) {
        updateData.profile = Buffer.from(profile, "base64");
        updateData.profileMediaType = profileMediaType;
      }
      await UPDATE(Employee).set(updateData).where({ ID: ID });

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
            fileName: attachment.fileName,
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Update the Employee Details ::: ${message}`);
      return req.reject(
        500,
        `Failed to Update the Employee Details ::: ${message}`,
      );
    }
  }

  private async handleDeleteEmployeeDetails(req: Request) {
    const db = await cds.connect.to("db");
    const { Employee } = db.entities;
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
      await UPDATE(Employee)
        .set({
          isActive: 0,
          modifierName: modifierName,
        })
        .where({ ID: ID });

      return {
        deletionStatus: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Delete the Employee Details ::: ${message}`);
      return req.reject(
        500,
        `Failed to Delete the Employee Details ::: ${message}`,
      );
    }
  }
  private async handleCreateCorporate(req: Request) {
    const db = await cds.connect.to("db");
    const { Employee, Corporate } = db.entities;
    try {
      const { corporateName, corporateURL } = req.data.data;
      console.log(`Corporate Details ::: ${JSON.stringify(req.data.data)}`);
      if (!corporateName || !corporateURL) {
        return req.reject(400, `Missing Corporate Details`);
      }

      const [existingCorporate] = await SELECT.from(Corporate).where({
        corporateURL: corporateURL,
      });

      if (existingCorporate) {
        return req.reject(409, `Corporate with the same URL already exists`);
      }
      const [currentUser] = await SELECT.from(Employee).where({
        email: req.user.id,
      });

      if (!currentUser) {
        return req.reject(404, `Current User Not Found`);
      }
      const creatorName = currentUser.fullName;
      const modifierName = currentUser.fullName;

      const [result] = await INSERT.into(Corporate).entries({
        corporateName,
        corporateURL,
        creatorName,
        modifierName,
        activeStatus: true,
      });
      if (!result) {
        throw new Error(
          `Failed to Create the Corporate Details in Corporate Table`,
        );
      }
      console.log(`Corporate ID ::: ${result?.ID}`);
      return {
        ID: result?.ID,
        creationStatus: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Create the Corporate Details ::: ${message}`);
      return req.reject(
        500,
        `Failed to Create the Corporate Details ::: ${message}`,
      );
    }
  }

  private async handleUpdateCorporate(req: Request) {
    const db = await cds.connect.to("db");
    const { Employee, Corporate } = db.entities;
    try {
      const { ID, corporateName, corporateURL, activeStatus } = req.data.data;
      if (!ID || !corporateName || !corporateURL) {
        return req.reject(400, `Missing Corporate Details`);
      }
      const [existingCorporate] = await SELECT.from(Corporate).where({
        ID: ID,
      });
      if (!existingCorporate) {
        return req.reject(404, `Corporate Not Found`);
      }
      const [modifier] = await SELECT.from(Employee).where({ email: req.id });
      let modifierName;
      if (!modifier) {
        modifierName = req.user.id;
      } else {
        modifierName = modifier?.fullName;
      }
      await UPDATE(Corporate)
        .set({
          corporateName,
          corporateURL,
          modifierName,
          activeStatus,
        })
        .where({ ID: ID });
      return {
        ID: ID,
        updateStatus: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Update the Corporate Details ::: ${message}`);
      return req.reject(
        500,
        `Failed to Update the Corporate Details ::: ${message}`,
      );
    }
  }
  private async handleCreateClient(req: Request) {
    const db = await cds.connect.to("db");
    const { Employee, Corporate, Client } = db.entities;
    try {
      const { clientFirstName, clientLastName, clientEmail, corporateID } =
        req.data.data;
      if (!clientFirstName || !clientLastName || !clientEmail || !corporateID) {
        return req.reject(400, `Missing Client Details`);
      }
      const [existingCorporate] = await SELECT.from(Corporate).where({
        ID: corporateID,
      });
      if (!existingCorporate) {
        return req.reject(404, `Corporate Not Found`);
      }
      const [existingClient] = await SELECT.from(Client).where({
        clientEmail: clientEmail,
      });
      if (existingClient) {
        return req.reject(
          409,
          `Client with the same email already exists for this Corporate`,
        );
      }
      let creatorName;
      let modifierName;
      const [currentUser] = await SELECT.from(Employee).where({
        email: req.user.id,
      });
      if (currentUser) {
        creatorName = currentUser.fullName;
        modifierName = currentUser.fullName;
      } else {
        creatorName = req.user.id;
        modifierName = req.user.id;
      }

      const fullName = `${clientFirstName.trim()} ${clientLastName.trim()}`;
      const [result] = await INSERT.into(Client).entries({
        clientFirstName,
        clientLastName,
        clientFullName: fullName,
        clientEmail,
        corporate_ID: corporateID,
        creatorName,
        modifierName,
      });
      if (!result) {
        throw new Error(`Failed to Create the Client Details in Client Table`);
      }
      console.log(`Client ID ::: ${result?.ID}`);
      return {
        ID: result?.ID,
        creationStatus: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Create the Client Details ::: ${message}`);
      return req.reject(
        500,
        `Failed to Create the Client Details ::: ${message}`,
      );
    }
  }
  private async handleUpdateClient(req: Request) {
    const db = await cds.connect.to("db");
    const { Employee, Corporate, Client } = db.entities;
    try {
      const { ID, clientFirstName, clientLastName, clientEmail, corporateID ,activeStatus} =
        req.data.data;
      if (
        !ID ||
        !clientFirstName ||
        !clientLastName ||
        !clientEmail ||
        !corporateID
      ) {
        return req.reject(400, `Missing Client Details`);
      }
      const [existingClient] = await SELECT.from(Client).where({ ID: ID });
      if (!existingClient) {
        return req.reject(404, `Client Not Found`);
      }
      const [existingCorporate] = await SELECT.from(Corporate).where({
        ID: corporateID,
      });
      if (!existingCorporate) {
        return req.reject(404, `Corporate Not Found`);
      }
      const [modifier] = await SELECT.from(Employee).where({ email: req.id });
      let modifierName;
      if (!modifier) {
        modifierName = req.user.id;
      } else {
        modifierName = modifier?.fullName;
      }
      const fullName = `${clientFirstName.trim()} ${clientLastName.trim()}`;
      await UPDATE(Client)
        .set({
          clientFirstName,
          clientLastName,
          clientFullName: fullName,
          clientEmail,
          corporate_ID: corporateID,
          modifierName,
          activeStatus,
        })
        .where({ ID: ID });
      return {
        ID: ID,
        updateStatus: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Update the Client Details ::: ${message}`);
      return req.reject(
        500,
        `Failed to Update the Client Details ::: ${message}`,
      );
    }
  }
  private async handleSendMail(req: Request) {
    try {
      const { to, cc, bcc, subject, body, attachments } = req.data.data;

      if (!to || to.length === 0) {
        return req.reject(400, `Missing recipient email(s)`);
      }
      if (!subject) {
        return req.reject(400, `Missing email subject`);
      }
      if (!body) {
        return req.reject(400, `Missing email body`);
      }

      const smtpUser = process.env.SMTP_USER;
      const smtpAppPassword = process.env.SMTP_APP_PASSWORD;

      if (!smtpUser || !smtpAppPassword) {
        return req.reject(
          500,
          `SMTP credentials not configured. Set SMTP_USER and SMTP_APP_PASSWORD environment variables.`,
        );
      }

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpAppPassword,
        },
      });

      const mailOptions: nodemailer.SendMailOptions = {
        from: smtpUser,
        to: to.join(", "),
        subject,
        html: body,
      };

      if (cc && cc.length > 0) {
        mailOptions.cc = cc.join(", ");
      }
      if (bcc && bcc.length > 0) {
        mailOptions.bcc = bcc.join(", ");
      }
      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments.map((att: AttachmentInput) => ({
          filename: att.fileName,
          content: Buffer.from(att.file, "base64"),
          contentType: att.mediaType,
        }));
      }

      const info = await transporter.sendMail(mailOptions);
      console.log(`Mail sent ::: ${info.messageId}`);

      return { mailSendStatus: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Send the Mail ::: ${message}`);
      return req.reject(500, `Failed to Send the Mail: ${message}`);
    }
  }
}
