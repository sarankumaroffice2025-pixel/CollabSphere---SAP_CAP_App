namespace collabSphere;

using {
    cuid,
    managed
} from '@sap/cds/common';

type approvalStatus                : String enum {
    approved = 'approved';
    onhold = 'onhold';
    request = 'request';
    cancelled = 'cancelled';
}

type activityStatus                : String enum {
    initiated = 'initiated';
    inprogress = 'inprogress';
    onhold = 'onhold';
    completed = 'completed';
    cancelled = 'cancelled';
}

type activityPriority              : String enum {
    low = 'low';
    medium = 'medium';
    high = 'high';
}

type attachmentType                : String enum {
    employeeResume = 'employeeResume';
    projectrequirements = 'projectRequirements';
}

type MailAttachment                : {
    fileName  : String(100);
    mediaType : String(100);
    file      : LargeBinary;
    fileSize  : Integer;
}

type MailDetails                   : {
    to          : array of String;
    cc          : array of String;
    bcc         : array of String;
    subject     : String;
    body        : String;
    attachments : array of MailAttachment;
}

type AttachmentDetails             : {
    fileName  : String(100);
    mediaType : String(100);
    file      : LargeBinary;
    fileSize  : Integer;
}

type DepartmentDetails             : {
    departmentName : String(100);
}

type UpdateDepartmentDetails       : {
    ID             : String;
    departmentName : String(100);
    activeStatus   : Boolean;
}

type EmployeePositionDetails       : {
    positionName : String;
    departmentID : String; // optional — leave null for cross-department roles (CEO, CTO, etc.)
}

type UpdateEmployeePositionDetails : {
    ID           : String;
    positionName : String;
    departmentID : String; // optional — leave null for cross-department roles (CEO, CTO, etc.)
}

type EmployeeDetails               : {
    firstName        : String(100);
    lastName         : String(100);
    email            : String(100);
    department       : String(100);
    position         : String(100);
    resume           : array of AttachmentDetails;
    profile          : LargeBinary;
    profileMediaType : String(150);
}

type updateEmployeeDetails         : {
    ID               : String;
    firstName        : String(100);
    lastName         : String(100);
    email            : String(100);
    department       : String(100);
    position         : String(100);
    resume           : array of AttachmentDetails;
    profile          : LargeBinary;
    profileMediaType : String(150);
}

type CorporateDetails              : {
    corporateName : String(100);
    corporateURL  : String(100);
}

type UpdateCorporateDetails        : {
    ID            : String;
    corporateName : String(100);
    corporateURL  : String(100);
    activeStatus  : Boolean;
}

type ClientDetails                 : {
    clientFirstName : String(100);
    clientLastName  : String(100);
    clientEmail     : String(100);
    corporateID     : String;
}

type UpdateClientDetails           : {
    ID              : String;
    clientFirstName : String(100);
    clientLastName  : String(100);
    clientEmail     : String(100);
    corporateID     : String;
    activeStatus    : Boolean;
}

type ProjectDetails                : {
    title       : String;
    description : String;
    startDate   : Date;
    endDate     : Date;
    budget      : Decimal(15, 2);
    corporateID : String;
}

type UpdateProjectDetails          : {
    ID             : String;
    title          : String;
    description    : String;
    startDate      : Date;
    endDate        : Date;
    budget         : Decimal(15, 2);
    corporateID    : String;
    approvedStatus : approvalStatus;
    activeStatus   : Boolean;
}

type ProjectClientData             : String;

type ProjectClientDetails          : {
    projectID   : String;
    corporateID : String;
    clientID    : array of ProjectClientData;
}

type UpdateProjectClientDetails    : {
    projectID   : String;
    corporateID : String;
    clientID    : array of ProjectClientData;
}

type ProjectApproverData           : String;

type UpdateProjectApproverData     : {
    approverID     : String;
    approvalStatus : approvalStatus;
    comment        : String;
}

type ProjectApproverDetails        : {
    projectID     : String;
    approversData : array of ProjectApproverData;
}

type UpdateProjectApproverDetails  : {
    projectID     : String;
    approversData : array of UpdateProjectApproverData;
    comment       : String;
}

type ProjectTeamDetails            : {
    projectID  : String;
    employeeID : array of String;
}

type UpdateProjectTeamDetails      : {
    projectID  : String;
    employeeID : array of String;
}

// type for add Project Team Member in exsiting Project Team
type addProjectTeamMemberDetails   : {
    projectID  : String;
    employeeID : array of String;
}

type ProjectTaskDetails            : {
    title       : String;
    description : String;
    projectID   : String;
    assigneeID  : String;
    content     : String;
    priority    : String;
}

type updateProjectTaskDetails      : {
    ID             : String;
    title          : String;
    description    : String;
    projectID      : String;
    assigneeID     : String;
    content        : String;
    priority       : String;
    activityStatus : String;
}

entity Department : cuid, managed {
    departmentName : String(100);
    activeStatus   : Boolean default true;
}

entity EmployeePosition : cuid, managed {
    positionName : String(100);
    department   : Association to one Department;
}

entity Employee : cuid, managed {
    userName         : String(100);
    firstName        : String(100);
    lastName         : String(100);
    fullName         : String(200);
    email            : String(100);
    creatorName      : String(100);
    modifierName     : String(100);
    department       : Association to one Department;
    position         : Association to one EmployeePosition;
    isActive         : Boolean default true;
    profile          : LargeBinary;
    profileMediaType : String(150);
}

entity Corporate : cuid, managed {
    corporateName : String(100);
    corporateURL  : String(100);
    creatorName   : String(100);
    modifierName  : String(100);
    activeStatus  : Boolean default true;
}

entity Client : cuid, managed {
    clientFirstName : String(100);
    clientLastName  : String(100);
    clientFullName  : String(200);
    clientEmail     : String(100);
    activeStatus    : Boolean default true;
    corporate       : Association to one Corporate;
    creatorName     : String(100);
    modifierName    : String(100);
}

entity Project : cuid, managed {
    title          : String;
    description    : String;
    startDate      : Date;
    endDate        : Date;
    approvedStatus : approvalStatus;
    budget         : Decimal(15, 2);
    creatorName    : String(100);
    modifierName   : String(100);
    corporate      : Association to one Corporate;
    clients        : Association to many ProjectClient
                         on clients.project = $self;
    approvers      : Association to many ProjectApprover
                         on approvers.project = $self;
    activeStatus   : Boolean default true;
}


entity ProjectClient : cuid, managed {
    project      : Association to Project;
    client       : Association to Client;
    corporate    : Association to Corporate;
    creatorName  : String(100);
    modifierName : String(100);
}

entity ProjectApprover : cuid, managed {
    project        : Association to Project;
    approver       : Association to Employee; // Employee ID
    approvalStatus : approvalStatus;
    comment        : String;
    creatorName    : String(100);
    modifierName   : String(100);
}


entity ProjectTeam : cuid, managed {
    project      : Association to Project;
    employee     : Association to Employee;
    employeeName : String(100);
    creatorName  : String(100);
    modifierName : String(100);
}

entity ProjectTask : cuid, managed {
    title          : String;
    description    : String;
    project        : Association to one Project;
    assignee       : Association to one Employee;
    content        : String;
    activityStatus : activityStatus default 'initiated';
    priority       : activityPriority default 'medium';
    creatorName    : String;
    modifierName   : String;
}

entity ProjectTaskComment : cuid, managed {
    task     : Association to one ProjectTask;
    assignee : Association to one Employee;
    content  : LargeBinary;
}

entity Asset : cuid, managed {
    assetid      : String(100); //It can be the Employee id or project id to get the attachment details of the particular Employee or Project
    creatorName  : String(100);
    modifierName : String(100);
    assetType    : attachmentType;
    attachment   : Association to many Attachment
                       on attachment.attachmentAsset = $self
}

entity Attachment : cuid {
    attachmentAsset : Association to Asset;
    fileName        : String(150);
    file            : LargeBinary;
    mediaType       : String(150);
    fileSize        : Integer;
}
