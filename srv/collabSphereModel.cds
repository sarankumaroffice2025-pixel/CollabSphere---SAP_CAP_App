using collabSphere from '../db/collabSphereModel';

service collabsphere {
    entity collabSphereEmployee         as projection on collabSphere.Employee;
    entity collabSphereProject          as projection on collabSphere.Project;
    entity collabSphereProjectClient    as projection on collabSphere.ProjectClient;
    entity collabSphereProjectAprrover  as projection on collabSphere.ProjectApprover;
    entity collabSphereProjectTeam      as projection on collabSphere.ProjectTeam;
    entity collabSphereProjectTask      as projection on collabSphere.ProjectTask;
    entity collabSphereTaskComment      as projection on collabSphere.ProjectTaskComment;
    entity collabSphereAsset            as projection on collabSphere.Asset;
    entity collabSphereCorporate        as projection on collabSphere.Corporate;
    entity collabSphereClient           as projection on collabSphere.Client;
    entity collabSphereDepartment       as projection on collabSphere.Department;
    entity collabSphereEmployeePosition as projection on collabSphere.EmployeePosition;

    //action to enter the Employee Details
    action createEmployeeDetails(data: collabSphere.EmployeeDetails)                returns {
        ID             : String;
        creationStatus : Boolean;
    }

    //action to get the Employee Details
    action accessEmployeeDetails(ID: String)                                        returns {
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
    
     //action to create a Department
    action createDepartment(data: collabSphere.DepartmentDetails)                   returns {
        ID             : String;
        creationStatus : Boolean;
    }

    //action to update the Department Details
    action updateDepartment(data: collabSphere.UpdateDepartmentDetails)             returns {
        ID           : String;
        updateStatus : Boolean;
    }

    //action to create an Employee Position
    action createEmployeePosition(data: collabSphere.EmployeePositionDetails)       returns {
        ID             : String;
        creationStatus : Boolean;
    }

    //action to update the Employee Position Details
    action updateEmployeePosition(data: collabSphere.UpdateEmployeePositionDetails) returns {
        ID           : String;
        updateStatus : Boolean;
    }
    
    //action to update the Employee Details
    action editEmployeeDetails(data: collabSphere.updateEmployeeDetails)            returns {
        ID           : String;
        updateStatus : Boolean;
    }

    //action to delete the Employee Details(False Deletion Method)
    action deleteEmployeeDetails(ID: String)                                        returns {
        deletetionStatus : Boolean;
    }

    //action to send the Mail
    action sendMail(data: collabSphere.MailDetails)                                 returns {
        mailSendStatus : Boolean;
    }


    //action to crete the Corporate
    action createCorporate(data: collabSphere.CorporateDetails)                     returns {
        ID             : String;
        creationStatus : Boolean;
    }

    //action to Update the Corporate Details
    action updateCorporate(data: collabSphere.UpdateCorporateDetails)               returns {
        ID           : String;
        updateStatus : Boolean;
    }

    //action to create a Client
    action createClient(data: collabSphere.ClientDetails)                           returns {
        ID             : String;
        creationStatus : Boolean;
    }

    //action to update the Client Details
    action updateClient(data: collabSphere.UpdateClientDetails)                     returns {
        ID           : String;
        updateStatus : Boolean;
    }

    //action to Create a Project
    action createProject(data: collabSphere.ProjectDetails)                         returns {
        ID             : String;
        creationStatus : Boolean;
    }

    //action to update the Project Details
    action updateProject(data: collabSphere.UpdateProjectDetails)                   returns {
        ID           : String;
        updateStatus : Boolean;
    }

    // action to get the Project Details
    action accessProjectDetails(ID: String)                                         returns {
        ID             : String;
        title          : String;
        description    : String;
        startDate      : Date;
        endDate        : Date;
        budget         : Decimal(15, 2);
        corporateID    : String;
        approvedStatus : String;
    }

    //action to delete the Project Details(False Deletion Method)
    action deleteProject(ID: String)                                                returns {
        deletetionStatus : Boolean;
    }

    //action to create the Project Client
    action createProjectClient(data: collabSphere.ProjectClientDetails)             returns {
        creationStatus : Boolean;
    }

    //action to update the Project Client Details
    action updateProjectClient(data: collabSphere.UpdateProjectClientDetails)       returns {
        updateStatus : Boolean;
    }

    //action to create the Project Approver
    action createProjectApprover(data: collabSphere.ProjectApproverDetails)         returns {
        creationStatus : Boolean;
    }

    //action to update the Project Approver Details
    action updateProjectApprover(data: collabSphere.UpdateProjectApproverDetails)   returns {
        updateStatus : Boolean;
    }
    
   //action to create the Project Team
    action createProjectTeam(data: collabSphere.ProjectTeamDetails)                 returns {
        creationStatus : Boolean;
    }

    //action to add the Project Team Member in exsiting Project Team
    action addProjectTeamMember(data: collabSphere.ProjectTeamDetails)           returns {
        updateStatus : Boolean;
    }

    //action to update the Project Team Details
    action updateProjectTeam(data: collabSphere.UpdateProjectTeamDetails)           returns {
        updateStatus : Boolean;
    }
   
    //action to create the Project Task
    action createProjectTask(data: collabSphere.ProjectTaskDetails)                 returns {
        ID             : String;
        creationStatus : Boolean;
    }

    //action to update the Project Task Details
    action updateProjectTask(data: collabSphere.updateProjectTaskDetails)           returns {
        ID           : String;
        updateStatus : Boolean;
    }

}
