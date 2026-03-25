import cds from "@sap/cds";
import { Request, Service } from '@sap/cds';

export default class collabSphereService extends cds.ApplicationService {
    async init(): Promise<void> {

        // action to enter the Employee Details
        this.on("employeeDetails", this.handleCreateEmployeeDetails.bind(this));

        await super.init();
    }

    private async handleCreateEmployeeDetails(req: Request) {
        const db = cds.connect.to("db");
        const { Employee, Asset, Attachment } = (await db).entities;
        const user = req.user;
        try {
            const { firstName, lastName, email, position, resume } = req.data.data;
            if (!firstName || !lastName || !email || !position || !resume || resume.length < 0) {
                return req.reject(400, `Missing Employee Details`);
            }
            console.log(`User Details ::: ${JSON.stringify(req.user)}`)
            let userName = user.id;

            const existingUser = await SELECT.from(Employee).where({ email: email });

            console.log(`Existing User ::: ${JSON.stringify(existingUser)}`)

            if (existingUser.length > 0) {
                return req.reject(409, `Employee Already exists`)
            }

            let fullName = `${firstName.trim()} ${lastName.trim()}`
            const [result] = await INSERT.into(Employee).entries({
                userName,
                firstName,
                lastName,
                fullName,
                email,
                position,
                isActive: 1,
            });

            if (!result) {
                throw new Error(`Failed to Upload the Employee Details in Employee Table`);
            }
            console.log(`Employee ID ::: ${result?.ID}`)
            const [assetResult] = await INSERT.into(Asset).entries({
                assetid: result?.ID,
                assetType: 'employeeResume',
            })
            if (!assetResult) {
                throw new Error(`Failed to Upload the Employee Asset in Asset Table`);
            }
            console.log(`Asset ID ::: ${assetResult.ID}`)
            for (const attachment of resume) {
                if (!attachment.fileName || !attachment.mediaType || !attachment.file || !attachment.fileSize) {
                    return req.reject(400, `Missing Attachment Details`);
                }
                const [attachmentResult] = await INSERT.into(Attachment).entries({
                    fileName: attachment.fileName,
                    mediaType: attachment.mediaType,
                    file: attachment.file,
                    fileSize: attachment.fileSize,
                    attachmentAsset_ID: assetResult?.ID,
                })
                if (!attachmentResult) {
                    throw new Error(`Failed to Upload the Employee Attachment in Attachment Table`);
                }

                console.log(`Attachment result ::: ${JSON.stringify(await SELECT.from(Attachment).where({ ID: attachmentResult.ID }))}`)
            }

            return {
                ID: result?.ID,
                creationStatus: true
            }
        } catch (error: any) {
            console.log(`Failed to Create the Employee Details ::: ${error.message}`);
            return req.reject(500, `Failed to Create the Employee Details ::: ${error.message}`)
        }
    }
}