using collabSphere from '../db/collabSphereModel';

service collabsphere {
    entity collabSphereEmployee        as projection on collabSphere.Employee;
    entity collabSphereProject         as projection on collabSphere.Project;
    entity collabSphereProjectClient   as projection on collabSphere.ProjectClient;
    entity collabSphereProjectAprrover as projection on collabSphere.ProjectApprover;
    entity collabSphereProjectTask     as projection on collabSphere.ProjectTask;
    entity collabSphereTaskComment     as projection on collabSphere.ProjectTaskComment;
    entity collabSphereAsset           as projection on collabSphere.Asset;

    //action to enter the Employee Details
    action createEmployeeDetails(data: collabSphere.EmployeeDetails)     returns {
        ID             : String(100);
        creationStatus : Boolean;
    }

    //action to get the Employee Details
    action accessEmployeeDetails(ID: String)                             returns {
        ID               : String;
        userName         : String;
        firstName        : String;
        lastName         : String;
        fullName         : String;
        email            : String;
        position         : String;
        isActive         : Boolean;
        resume           : collabSphere.AttachmentDetails;
        profile          : LargeBinary;
        profileMediaType : String;
    }

    //action to update the Employee Details
    action editEmployeeDetails(data: collabSphere.updateEmployeeDetails) returns {
        ID           : String;
        updateStatus : Boolean;
    }

    //action to delete the Employee Details(False Deletion Method)
    action deleteEmployeeDetails(ID: String)                             returns {
        deletetionStatus : Boolean;
    }

    //action to send the Mail
    action sendMail(data: collabSphere.MailDetails)                      returns {
        mailSendStatus : Boolean;
    }
}
