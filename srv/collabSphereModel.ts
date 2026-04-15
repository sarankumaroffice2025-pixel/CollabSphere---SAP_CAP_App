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
  private readonly VALID_APPROVAL_STATUS = [
    "approved",
    "onhold",
    "request",
    "cancelled",
  ] as const;

  async init(): Promise<void> {
    //action to create a Department
    this.on("createDepartment", this.handleCreateDepartment.bind(this));

    //action to update the Department Details
    this.on("updateDepartment", this.handleUpdateDepartment.bind(this));

    //action to create an Employee Position
    this.on(
      "createEmployeePosition",
      this.handleCreateEmployeePosition.bind(this),
    );

    //action to update the Employee Position Details
    this.on(
      "updateEmployeePosition",
      this.handleUpdateEmployeePosition.bind(this),
    );

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

    // action to Create the Corporate Details
    this.on("createCorporate", this.handleCreateCorporate.bind(this));

    //action to update the Corporate Details
    this.on("updateCorporate", this.handleUpdateCorporate.bind(this));

    // action to Create the Client Details
    this.on("createClient", this.handleCreateClient.bind(this));

    //action to update the Client Details
    this.on("updateClient", this.handleUpdateClient.bind(this));

    //action to Create the Project Details
    this.on("createProject", this.handleCreateProject.bind(this));

    //action to update the Project Details
    this.on("updateProject", this.handleUpdateProject.bind(this));

    //action to get the Project Details
    this.on("accessProjectDetails", this.handleAccessProjectDetails.bind(this));

    //action to delete the Project Details
    this.on("deleteProject", this.handleDeleteProject.bind(this));

    //action to Create the Project Client Details
    this.on("createProjectClient", this.handleCreateProjectClient.bind(this));

    //action to update the Project Client Details
    this.on("updateProjectClient", this.handleUpdateProjectClient.bind(this));

    //action to Create the Project Approver Details
    this.on(
      "createProjectApprover",
      this.handleCreateProjectApprover.bind(this),
    );

    //action to update the Project Approver Details
    this.on(
      "updateProjectApprover",
      this.handleUpdateProjectApprover.bind(this),
    );

    //action to Create the Project Team Details
    this.on("createProjectTeam", this.handleCreateProjectTeam.bind(this));

    //action to update the Project Team Details by Delete the entire team and recreate it
    this.on("updateProjectTeam", this.handleUpdateProjectTeam.bind(this));

    //action to add the Team Membaer in Existing Team
    this.on(
      "addProjectTeamMember",
      this.handleAddProjectTeamMembers.bind(this),
    );

    //action to Create the Project Task Details
    this.on("createProjectTask", this.handleCreateProjectTask.bind(this));

    //action to update the Project Task Details
    this.on("updateProjectTask", this.handleUpdateProjectTask.bind(this));

    //action to send the mail for any action
    this.on("sendMail", this.handleSendMail.bind(this));

    await super.init();
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  private async handleCreateDepartment(req: Request) {
    const db = await cds.connect("db");
    const { Department } = db.entities;
    try {
      const { departmentName } = req.data.data;
      if (!departmentName) {
        return req.reject(400, `Missing Department Details`);
      }
      const [existingDepartment] = await SELECT.from(Department).where({
        departmentName: departmentName.trim(),
      });
      if (existingDepartment) {
        return req.reject(
          409,
          `Department '${departmentName.trim()}' already exists`,
        );
      }
      const [result] = await INSERT.into(Department).entries({
        departmentName: departmentName.trim(),
        activeStatus: true,
      });
      if (!result) {
        throw new Error(`Failed to create Department`);
      }
      return { ID: result, creationStatus: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Create Department ::: ${message}`);
      return req.reject(500, `Failed to Create Department: ${message}`);
    }
  }

  private async handleUpdateDepartment(req: Request) {
    const db = await cds.connect("db");
    const { Department } = db.entities;
    try {
      const { ID, departmentName, activeStatus } = req.data.data;
      if (!ID) {
        return req.reject(400, `Missing ID`);
      }
      const [existing] = await SELECT.from(Department).where({ ID });
      if (!existing) {
        return req.reject(404, `Department Not Found`);
      }
      if (!departmentName) {
        return req.reject(400, `Missing Department Details`);
      }
      // let modifierName;
      // const [modifier] = await SELECT.from(Employee).where({
      //   email: req.user.id,
      // });
      // if (!modifier) {
      //   modifierName = req.user.id;
      // } else {
      //   modifierName = modifier?.fullName;
      // }
      await UPDATE(Department)
        .set({
          departmentName: departmentName.trim(),
          activeStatus,
        })
        .where({ ID });
      return { ID, updateStatus: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Update Department ::: ${message}`);
      return req.reject(500, `Failed to Update Department: ${message}`);
    }
  }

  private async handleCreateEmployeePosition(req: Request) {
    const db = await cds.connect("db");
    const { EmployeePosition, Department } = db.entities;
    try {
      const { positionName, departmentID } = req.data.data;
      if (!positionName) {
        return req.reject(400, `Missing Employee Position Details`);
      }
      if (departmentID) {
        const [existingDepartment] = await SELECT.from(Department).where({
          ID: departmentID,
        });
        if (!existingDepartment) {
          return req.reject(404, `Department Not Found`);
        }
      }
      const duplicateQuery = departmentID
        ? SELECT.from(EmployeePosition).where({
            positionName: positionName.trim(),
            department_ID: departmentID,
          })
        : SELECT.from(EmployeePosition).where({
            positionName: positionName.trim(),
            department_ID: null,
          });
      const [existingPosition] = await duplicateQuery;
      if (existingPosition) {
        return req.reject(
          409,
          `Employee Position '${positionName.trim()}' already exists${departmentID ? " in this department" : ""}`,
        );
      }
      const positionEntry: Record<string, unknown> = {
        positionName: positionName.trim(),
      };
      if (departmentID) {
        positionEntry.department_ID = departmentID;
      }
      const [result] =
        await INSERT.into(EmployeePosition).entries(positionEntry);
      if (!result) {
        throw new Error(`Failed to create Employee Position`);
      }
      return { ID: result, creationStatus: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Create Employee Position ::: ${message}`);
      return req.reject(500, `Failed to Create Employee Position: ${message}`);
    }
  }

  private async handleUpdateEmployeePosition(req: Request) {
    const db = await cds.connect("db");
    const { EmployeePosition, Department } = db.entities;
    try {
      const { ID, positionName, departmentID } = req.data.data;
      if (!ID) {
        return req.reject(400, `Missing ID`);
      }
      const [existing] = await SELECT.from(EmployeePosition).where({ ID });
      if (!existing) {
        return req.reject(404, `Employee Position Not Found`);
      }
      if (!positionName) {
        return req.reject(400, `Missing Employee Position Details`);
      }
      if (departmentID) {
        const [existingDepartment] = await SELECT.from(Department).where({
          ID: departmentID,
        });
        if (!existingDepartment) {
          return req.reject(404, `Department Not Found`);
        }
      }
      const updateSet: Record<string, unknown> = {
        positionName: positionName.trim(),
      };
      updateSet.department_ID = departmentID ?? null;
      await UPDATE(EmployeePosition).set(updateSet).where({ ID });
      return { ID, updateStatus: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Update Employee Position ::: ${message}`);
      return req.reject(500, `Failed to Update Employee Position: ${message}`);
    }
  }

  private async handleCreateEmployeeDetails(req: Request) {
    const db = cds.connect.to("db");
    const { Employee, Asset, Attachment, Department, EmployeePosition } = (
      await db
    ).entities;
    try {
      const {
        firstName,
        lastName,
        email,
        department,
        position,
        resume,
        profile,
        profileMediaType,
      } = req.data.data;
      if (
        !firstName ||
        !lastName ||
        !email ||
        !department ||
        !position ||
        !resume ||
        resume.length < 0
      ) {
        return req.reject(400, `Missing Employee Details`);
      }
      console.log(`Employee Details ::: ${JSON.stringify(req.data.data)}`);
      console.log(`User Details ::: ${JSON.stringify(req.user)}`);
      const userName = email;

      const existingUser = await SELECT.from(Employee).where({ email: email });

      console.log(`Existing User ::: ${JSON.stringify(existingUser)}`);

      if (existingUser.length > 0) {
        return req.reject(409, `Employee Already exists`);
      }

      const [existingDepartment] = await SELECT.from(Department).where({
        ID: department,
      });
      if (!existingDepartment) {
        return req.reject(404, `Department Not Found`);
      }
      console.log(`Position ID ::: ${position}`);
      const [existingPosition] = await SELECT.from(EmployeePosition).where({
        ID: position,
      });
      if (!existingPosition) {
        return req.reject(404, `Employee Position Not Found`);
      }
      console.log(`Existing Position ::: ${JSON.stringify(existingPosition)}`);
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

      const [result] = await INSERT.into(Employee).entries({
        userName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: fullName,
        email,
        department_ID: department,
        position_ID: position,
        isActive: 1,
        profile: profile ? Buffer.from(profile, "base64") : null,
        profileMediaType: profileMediaType ?? null,
        creatorName,
        modifierName,
      });
      if (!result) {
        throw new Error(`Failed to Create the Employee Details`);
      }
      console.log(`New Employee ID ::: ${result.ID}`);
      const [assetResult] = await INSERT.into(Asset).entries({
        assetid: result.ID,
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
          attachmentAsset_ID: assetResult.ID,
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
        ID: result.ID,
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
        position: existingEmployee.position_ID,
        department: existingEmployee.department_ID,
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
    const { Employee, Asset, Attachment, Department, EmployeePosition } =
      db.entities;
    try {
      const {
        ID,
        firstName,
        lastName,
        email,
        department,
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
        !department ||
        !position ||
        !resume ||
        resume.length < 0
      ) {
        return req.reject(400, `Missing Update Data`);
      }

      const [existingDepartment] = await SELECT.from(Department).where({
        ID: department,
      });
      if (!existingDepartment) {
        return req.reject(404, `Department Not Found`);
      }

      const [existingPosition] = await SELECT.from(EmployeePosition).where({
        ID: position,
      });
      if (!existingPosition) {
        return req.reject(404, `Employee Position Not Found`);
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
        department_ID: department,
        position_ID: position,
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
      console.log(`Corporate ID ::: ${result}`);
      return {
        ID: result,
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
      console.log(`Client ID ::: ${result}`);
      return {
        ID: result,
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
      const {
        ID,
        clientFirstName,
        clientLastName,
        clientEmail,
        corporateID,
        activeStatus,
      } = req.data.data;
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

  private async handleCreateProject(req: Request) {
    const db = await cds.connect.to("db");
    const { Project, Corporate, Employee } = db.entities;
    try {
      const { title, description, startDate, endDate, budget, corporateID } =
        req.data.data;
      if (
        !title ||
        !description ||
        !startDate ||
        !endDate ||
        !budget ||
        !corporateID
      ) {
        return req.reject(400, `Missing Project Details`);
      }
      let creatorName;
      let modifierName;
      const [currentUser] = await SELECT.from(Employee).where({
        email: req.user.id,
      });
      if (!currentUser) {
        creatorName = req.user.id;
        modifierName = req.user.id;
      } else {
        creatorName = currentUser.fullName;
        modifierName = currentUser.fullName;
      }

      const [existingCorporate] = await SELECT.from(Corporate).where({
        ID: corporateID,
      });
      if (!existingCorporate) {
        return req.reject(404, `Corporate Not Found`);
      }
      const [result] = await INSERT.into(Project).entries({
        title,
        description,
        startDate,
        endDate,
        approvedStatus: "request",
        budget,
        creatorName,
        modifierName,
        corporate_ID: corporateID,
      });
      if (!result) {
        throw new Error(
          `Failed to Create the Project Details in Project Table`,
        );
      }
      console.log(`Project ID ::: ${result}`);
      return {
        ID: result.ID,
        creationStatus: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Create the Project Details ::: ${message}`);
      return req.reject(
        500,
        `Failed to Create the Project Details ::: ${message}`,
      );
    }
  }
  private async handleUpdateProject(req: Request) {
    const db = await cds.connect.to("db");
    const { Project, Corporate, Employee } = db.entities;
    try {
      const {
        ID,
        title,
        description,
        startDate,
        endDate,
        budget,
        corporateID,
        approvedStatus,
        activeStatus,
      } = req.data.data;
      if (
        !ID ||
        !title ||
        !description ||
        !startDate ||
        !endDate ||
        !budget ||
        !corporateID ||
        !approvedStatus ||
        !activeStatus
      ) {
        return req.reject(400, `Missing Project Details`);
      }
      if (!this.VALID_APPROVAL_STATUS.includes(approvedStatus)) {
        return req.reject(
          400,
          `Invalid approvalStatus '${approvedStatus}'. Must be one of: ${this.VALID_APPROVAL_STATUS.join(", ")}`,
        );
      }

      const [existingProject] = await SELECT.from(Project).where({ ID: ID });
      if (!existingProject) {
        return req.reject(404, `Project Not Found`);
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
      await UPDATE(Project)
        .set({
          title,
          description,
          startDate,
          endDate,
          budget,
          corporate_ID: corporateID,
          approvedStatus,
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
      console.error(`Failed to Update the Project Details ::: ${message}`);
      return req.reject(
        500,
        `Failed to Update the Project Details ::: ${message}`,
      );
    }
  }

  private async handleAccessProjectDetails(req: Request) {
    const db = await cds.connect.to("db");
    const { Project } = db.entities;
    try {
      const { ID } = req.data;
      if (!ID) {
        return req.reject(400, `Missing Project ID`);
      }
      const [existingProject] = await SELECT.from(Project).where({ ID: ID });
      if (!existingProject) {
        return req.reject(404, `Project Not Found`);
      }
      return {
        ID: existingProject.ID,
        title: existingProject.title,
        description: existingProject.description,
        startDate: existingProject.startDate,
        endDate: existingProject.endDate,
        budget: existingProject.budget,
        approvedStatus: existingProject.approvedStatus,
        activeStatus: existingProject.activeStatus,
        corporate_ID: existingProject.corporate_ID,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Get the Project Details ::: ${message}`);
      return req.reject(
        500,
        `Failed to Get the Project Details ::: ${message}`,
      );
    }
  }

  private async handleDeleteProject(req: Request) {
    const db = await cds.connect.to("db");
    const { Project } = db.entities;
    try {
      const { ID } = req.data;
      if (!ID) {
        return req.reject(400, `Missing Project ID`);
      }
      const [existingProject] = await SELECT.from(Project).where({ ID: ID });
      if (!existingProject) {
        return req.reject(404, `Project Not Found`);
      }
      await UPDATE(Project)
        .set({
          activeStatus: false,
        })
        .where({ ID: ID });
      return {
        ID: ID,
        deletionStatus: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Delete the Project Details ::: ${message}`);
      return req.reject(
        500,
        `Failed to Delete the Project Details ::: ${message}`,
      );
    }
  }

  private async handleCreateProjectClient(req: Request) {
    const db = await cds.connect.to("db");
    const { ProjectClient, Project, Client, Corporate, Employee } = db.entities;
    try {
      const { projectID, corporateID, clientID } = req.data.data;
      if (!projectID || !corporateID || !clientID || clientID.length === 0) {
        return req.reject(400, `Missing Project Client Details`);
      }
      const [existingProject] = await SELECT.from(Project).where({
        ID: projectID,
      });
      if (!existingProject) {
        return req.reject(404, `Project Not Found`);
      }

      const [existingCorporate] = await SELECT.from(Corporate).where({
        ID: corporateID,
      });
      if (!existingCorporate) {
        return req.reject(404, `Corporate Not Found`);
      }

      let creatorName, modifierName;
      const [modifier] = await SELECT.from(Employee).where({ email: req.id });
      if (!modifier) {
        creatorName = req.user.id;
        modifierName = req.user.id;
      } else {
        creatorName = modifier?.fullName;
        modifierName = modifier?.fullName;
      }
      for (const client of clientID) {
        const [existingClient] = await SELECT.from(Client).where({
          ID: client,
        });
        if (!existingClient) {
          return req.reject(404, `Client Not Found for ID: ${client}`);
        } else {
          const [result] = await INSERT.into(ProjectClient).entries({
            project_ID: projectID,
            client_ID: client,
            corporate_ID: corporateID,
            creatorName,
            modifierName,
          });
          if (!result) {
            throw new Error(
              `Failed to Create the Project Client Details in ProjectClient Table for Client ID: ${client}`,
            );
          }
        }
      }
      return {
        creationStatus: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `Failed to Create the Project Client Details ::: ${message}`,
      );
      return req.reject(
        500,
        `Failed to Create the Project Client Details ::: ${message}`,
      );
    }
  }

  private async handleUpdateProjectClient(req: Request) {
    const db = await cds.connect.to("db");
    const { ProjectClient, Project, Client, Corporate, Employee } = db.entities;
    try {
      const { projectID, corporateID, clientID } = req.data.data;
      if (!projectID || !corporateID || !clientID || clientID.length === 0) {
        return req.reject(400, `Missing Project Client Details`);
      }
      const [existingProject] = await SELECT.from(Project).where({
        ID: projectID,
      });
      if (!existingProject) {
        return req.reject(404, `Project Not Found`);
      }

      const [existingCorporate] = await SELECT.from(Corporate).where({
        ID: corporateID,
      });
      if (!existingCorporate) {
        return req.reject(404, `Corporate Not Found`);
      }
      let creatorName;
      let modifierName;
      const [modifier] = await SELECT.from(Employee).where({ email: req.id });
      if (!modifier) {
        modifierName = req.user.id;
      } else {
        modifierName = modifier?.fullName;
      }
      const [existingProjectClients] = await SELECT.from(ProjectClient).where({
        project_ID: projectID,
      });
      if (existingProjectClients.length === 0) {
        return req.reject(
          404,
          `Project Client Details Not Found for the Project`,
        );
      } else {
        creatorName = existingProjectClients.creatorName;
      }
      await DELETE.from(ProjectClient).where({ project_ID: projectID });
      for (const client of clientID) {
        const [existingClient] = await SELECT.from(Client).where({
          ID: client,
        });
        if (!existingClient) {
          return req.reject(404, `Client Not Found for ID: ${client}`);
        } else {
          const [result] = await INSERT.into(ProjectClient).entries({
            project_ID: projectID,
            client_ID: client,
            corporate_ID: corporateID,
            creatorName,
            modifierName,
          });
          if (!result) {
            throw new Error(
              `Failed to Update the Project Client Details in ProjectClient Table for Client ID: ${client}`,
            );
          }
        }
      }
      return {
        updateStatus: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `Failed to Update the Project Client Details ::: ${message}`,
      );
      return req.reject(
        500,
        `Failed to Update the Project Client Details ::: ${message}`,
      );
    }
  }

  private async handleCreateProjectApprover(req: Request) {
    const db = await cds.connect.to("db");
    const { ProjectApprover, Project, Employee } = db.entities;
    try {
      const { projectID, approversData } = req.data.data;
      if (!projectID || !approversData || approversData.length === 0) {
        return req.reject(400, `Missing Project Approver Details`);
      }
      const [existingProject] = await SELECT.from(Project).where({
        ID: projectID,
      });
      if (!existingProject) {
        return req.reject(404, `Project Not Found`);
      }
      let creatorName, modifierName;
      const [modifier] = await SELECT.from(Employee).where({ email: req.id });
      if (!modifier) {
        creatorName = req.user.id;
        modifierName = req.user.id;
      } else {
        creatorName = modifier?.fullName;
        modifierName = modifier?.fullName;
      }
      for (const approverData of approversData) {
        const [existingApprover] = await SELECT.from(Employee).where({
          ID: approverData,
        });
        if (!existingApprover) {
          return req.reject(404, `Approver Not Found for ID: ${approverData}`);
        } else {
          const [result] = await INSERT.into(ProjectApprover).entries({
            project_ID: projectID,
            approver_ID: approverData,
            approverStatus: "request",
            creatorName,
            modifierName,
          });
          if (!result) {
            throw new Error(
              `Failed to Create the Project Approver Details for Approver ID: ${approverData}`,
            );
          }
        }
      }
      return {
        creationStatus: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `Failed to Create the Project Approver Details ::: ${message}`,
      );
      return req.reject(
        500,
        `Failed to Create the Project Approver Details ::: ${message}`,
      );
    }
  }

  private async handleUpdateProjectApprover(req: Request) {
    const db = await cds.connect.to("db");
    const { ProjectApprover, Project, Employee } = db.entities;
    try {
      const { projectID, approversData } = req.data.data;
      if (!projectID || !approversData || approversData.length === 0) {
        return req.reject(400, `Missing Project Approver Details`);
      }
      const [existingProject] = await SELECT.from(Project).where({
        ID: projectID,
      });
      if (!existingProject) {
        return req.reject(404, `Project Not Found`);
      }
      let creatorName;
      let modifierName;
      const [existingProjectApprovers] = await SELECT.from(
        ProjectApprover,
      ).where({
        project_ID: projectID,
      });
      if (existingProjectApprovers.length === 0) {
        return req.reject(
          404,
          `Project Approver Details Not Found for the Project`,
        );
      } else {
        creatorName = existingProjectApprovers.creatorName;
      }
      const [modifier] = await SELECT.from(Employee).where({ email: req.id });
      if (modifier) {
        modifierName = modifier.fullName;
      }
      await DELETE.from(ProjectApprover).where({ project_ID: projectID });
      for (const approverData of approversData) {
        if (
          !approverData.approverID ||
          !approverData.approvalStatus ||
          !approverData.comment
        ) {
          return req.reject(
            400,
            `Missing Approver Details in thee Approver Data`,
          );
        }

        if (!this.VALID_APPROVAL_STATUS.includes(approverData.approvalStatus)) {
          return req.reject(
            400,
            `Invalid approvalStatus '${approverData.approvalStatus}' for approver ID: ${approverData.approverID}. Must be one of: ${this.VALID_APPROVAL_STATUS.join(", ")}`,
          );
        }
        const [existingApprover] = await SELECT.from(Employee).where({
          ID: approverData.approverID,
        });
        if (!existingApprover) {
          return req.reject(
            404,
            `Approver Not Found for ID: ${approverData.approverID}`,
          );
        } else {
          const [result] = await INSERT.into(ProjectApprover).entries({
            project_ID: projectID,
            approvalStatus: approverData.approvalStatus,
            approver_ID: approverData.approverID,
            creatorName,
            modifierName,
            comment: approverData.comment || null,
          });
          if (!result) {
            throw new Error(
              `Failed to Update the Project Approver Details for Approver ID: ${approverData.approverID}`,
            );
          }
        }
      }
      return {
        updateStatus: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `Failed to Update the Project Approver Details ::: ${message}`,
      );
      return req.reject(
        500,
        `Failed to Update the Project Approver Details ::: ${message}`,
      );
    }
  }

  private async handleCreateProjectTeam(req: Request) {
    const db = await cds.connect.to("db");
    const { ProjectTeam, Project, Employee } = db.entities;
    try {
      const { projectID, employeeID } = req.data.data;
      if (!projectID || !employeeID || employeeID.length === 0) {
        return req.reject(400, `Missing Project Team Details`);
      }
      const [existingProject] = await SELECT.from(Project).where({
        ID: projectID,
      });
      if (!existingProject) {
        return req.reject(404, `Project Not Found`);
      }
      const [existingProjectTeam] = await SELECT.from(ProjectTeam).where({
        project_ID: projectID,
      });
      if (existingProjectTeam.length > 0) {
        return req.reject(
          409,
          `Project Team Details already exist for the Project. Please use Update API Calls to modify the details.`,
        );
      }
      let creatorName, modifierName;
      const [modifier] = await SELECT.from(Employee).where({ email: req.id });
      if (!modifier) {
        creatorName = req.user.id;
        modifierName = req.user.id;
      } else {
        creatorName = modifier?.fullName;
        modifierName = modifier?.fullName;
      }
      for (const empID of employeeID) {
        const [existingEmployee] = await SELECT.from(Employee).where({
          ID: empID,
        });
        if (!existingEmployee) {
          return req.reject(404, `Employee Not Found for ID: ${empID}`);
        }
        const [result] = await INSERT.into(ProjectTeam).entries({
          project_ID: projectID,
          employee_ID: empID,
          employeeName: existingEmployee.fullName,
          creatorName,
          modifierName,
        });
        if (!result) {
          throw new Error(
            `Failed to Create the Project Team Details for Employee ID: ${empID}`,
          );
        }
      }
      return {
        creationStatus: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Create the Project Team Details ::: ${message}`);
      return req.reject(
        500,
        `Failed to Create the Project Team Details ::: ${message}`,
      );
    }
  }

  private async handleAddProjectTeamMembers(req: Request) {
    const db = await cds.connect.to("db");
    const { ProjectTeam, Employee, Project } = db.entities;

    try {
      const { projectID, employeeID } = req.data.data;

      if (!projectID || !employeeID || employeeID.length === 0) {
        return req.reject(400, `Missing Project Team Details`);
      }

      const [project] = await SELECT.from(Project).where({
        ID: projectID,
      });

      if (!project) {
        return req.reject(404, `Project Not Found`);
      }

      const existingProjectTeam = await SELECT.from(ProjectTeam).where({
        project_ID: projectID,
      });

      let creatorName, modifierName;

      const [modifier] = await SELECT.from(Employee).where({
        email: req.id,
      });

      if (!modifier) {
        creatorName = req.user.id;
        modifierName = req.user.id;
      } else {
        creatorName = modifier.fullName;
        modifierName = modifier.fullName;
      }

      for (const empID of employeeID) {
        const [employee] = await SELECT.from(Employee).where({
          ID: empID,
        });

        if (!employee) {
          return req.reject(404, `Employee Not Found in Employee Table`);
        }

        const exists = existingProjectTeam.some(
          (member: { employee_ID: string }) => member.employee_ID === empID,
        );

        if (exists) {
          await UPDATE(ProjectTeam)
            .set({
              employeeName: employee.fullName,
              modifierName,
            })
            .where({
              project_ID: projectID,
              employee_ID: empID,
            });
        } else {
          const result = await INSERT.into(ProjectTeam).entries({
            project_ID: projectID,
            employee_ID: empID,
            employeeName: employee.fullName,
            creatorName,
            modifierName,
          });

          if (!result) {
            throw new Error(`Failed to Insert Employee into Project Team`);
          }
        }
      }

      return {
        updateStatus: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      return req.reject(
        500,
        `Failed to Add Members to the Project Team ::: ${message}`,
      );
    }
  }

  private async handleUpdateProjectTeam(req: Request) {
    const db = await cds.connect.to("db");
    const { ProjectTeam, Project, Employee } = db.entities;
    try {
      const { projectID, employeeID } = req.data.data;
      if (!projectID || !employeeID || employeeID.length === 0) {
        return req.reject(400, `Missing Project Team Details`);
      }
      const [existingProject] = await SELECT.from(Project).where({
        ID: projectID,
      });
      if (!existingProject) {
        return req.reject(404, `Project Not Found`);
      }
      let creatorName;
      let modifierName;
      const [existingProjectTeam] = await SELECT.from(ProjectTeam).where({
        project_ID: projectID,
      });
      console.log(
        `Existing Project Team ::: ${JSON.stringify(existingProjectTeam)}`,
      );
      if (existingProjectTeam.length === 0) {
        return req.reject(
          404,
          `Project Team Details Not Found for the Project`,
        );
      } else {
        creatorName = existingProjectTeam.creatorName;
      }
      const [modifier] = await SELECT.from(Employee).where({ email: req.id });
      if (modifier) {
        modifierName = modifier.fullName;
      }
      await DELETE.from(ProjectTeam).where({ project_ID: projectID });
      for (const empID of employeeID) {
        const [existingEmployee] = await SELECT.from(Employee).where({
          ID: empID,
        });
        if (!existingEmployee) {
          return req.reject(404, `Employee Not Found for ID: ${empID}`);
        }
        const [result] = await INSERT.into(ProjectTeam).entries({
          project_ID: projectID,
          employee_ID: empID,
          employeeName: existingEmployee.fullName,
          creatorName,
          modifierName,
        });
        if (!result) {
          throw new Error(
            `Failed to Update the Project Team Details for Employee ID: ${empID}`,
          );
        }
      }
      return {
        updateStatus: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Update the Project Team Details ::: ${message}`);
      return req.reject(
        500,
        `Failed to Update the Project Team Details ::: ${message}`,
      );
    }
  }

  private async handleCreateProjectTask(req: Request) {
    const db = await cds.connect.to("db");
    const { ProjectTask, ProjectTeam, Project, Employee } = db.entities;
    try {
      const { title, description, projectID, assigneeID, content, priority } =
        req.data.data;

      if (
        !title ||
        !description ||
        !projectID ||
        !assigneeID ||
        !content ||
        !priority
      ) {
        return req.reject(400, `Missing Project Task Details`);
      }
      const [existingProject] = await SELECT.from(Project).where({
        ID: projectID,
      });
      if (!existingProject) {
        return req.reject(404, `Project Not Found`);
      }
      const [existingAssignee] = await SELECT.from(Employee).where({
        ID: assigneeID,
      });
      if (!existingAssignee) {
        return req.reject(404, `Assignee Not Found`);
      }
      let creatorName, modifierName;
      const [modifier] = await SELECT.from(Employee).where({ email: req.id });
      if (!modifier) {
        creatorName = req.user.id;
        modifierName = req.user.id;
      } else {
        creatorName = modifier?.fullName;
        modifierName = modifier?.fullName;
      }
      const [projectTeam] = await SELECT.from(ProjectTeam).where({
        project_ID: projectID,
      });

      if (!projectTeam) {
        return req.reject(404, `Project Team Not Found for the Project`);
      }
      console.log(
        `Project Team Employee ID ::: ${JSON.stringify(projectTeam)}`,
      );

      if (projectTeam.employee_ID !== assigneeID) {
        return req.reject(400, `Assignee is not part of the Project Team`);
      }
      const validPriorities = ["low", "medium", "high"];
      if (!validPriorities.includes(priority)) {
        return req.reject(
          400,
          `Invalid priority. Please choose from: ${validPriorities.join(", ")}`,
        );
      }

      const [result] = await INSERT.into(ProjectTask).entries({
        title,
        description,
        project_ID: projectID,
        assignee_ID: assigneeID,
        content,
        priority,
        activityStatus: "initiated",
        creatorName,
        modifierName,
      });

      if (!result) {
        throw new Error(
          `Failed to Create the Project Task Details in ProjectTask Table`,
        );
      }
      console.log(`Project Task ID ::: ${result}`);
      return {
        ID: result.ID,
        creationStatus: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Create the Project Task Details ::: ${message}`);
      return req.reject(
        500,
        `Failed to Create the Project Task Details ::: ${message}`,
      );
    }
  }

  private async handleUpdateProjectTask(req: Request) {
    const db = await cds.connect.to("db");
    const { ProjectTask, Employee } = db.entities;
    try {
      const {
        ID,
        title,
        description,
        projectID,
        assigneeID,
        content,
        priority,
        activityStatus,
      } = req.data.data;
      if (
        !ID ||
        !title ||
        !description ||
        !projectID ||
        !assigneeID ||
        !content ||
        !priority ||
        !activityStatus
      ) {
        return req.reject(400, `Missing Project Task Details`);
      }
      const [existingProjectTask] = await SELECT.from(ProjectTask).where({
        ID: ID,
      });
      if (!existingProjectTask) {
        return req.reject(404, `Project Task Not Found`);
      }
      const ValidActivityStatus = [
        "initiated",
        "inprogress",
        "onhold",
        "completed",
        "cancelled",
      ];
      const validPriorities = ["low", "medium", "high"];
      if (!ValidActivityStatus.includes(activityStatus)) {
        return req.reject(
          400,
          `Invalid activityStatus '${activityStatus}'. Must be one of: ${ValidActivityStatus.join(", ")}`,
        );
      }
      if (!validPriorities.includes(priority)) {
        return req.reject(
          400,
          `Invalid priority. Please choose from: ${validPriorities.join(", ")}`,
        );
      }
      let modifierName;
      const [modifier] = await SELECT.from(Employee).where({ email: req.id });
      if (!modifier) {
        modifierName = req.user.id;
      } else {
        modifierName = modifier?.fullName;
      }

      await UPDATE(ProjectTask)
        .set({
          title,
          description,
          project_ID: projectID,
          assignee_ID: assigneeID,
          content,
          priority,
          activityStatus,
          modifierName: modifierName,
        })
        .where({ ID: ID });
      return {
        ID: ID,
        updateStatus: true,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to Update the Project Task Details ::: ${message}`);
      return req.reject(
        500,
        `Failed to Update the Project Task Details ::: ${message}`,
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
