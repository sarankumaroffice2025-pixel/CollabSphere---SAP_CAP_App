namespace collabSphere;

using {
    cuid,
    managed
} from '@sap/cds/common';

type employeePosition       : String enum {
    ceo = 'ceo';
    cto = 'cto';
    cfo = 'cfo';
    coo = 'coo';
    director = 'director';
    seniorManager = 'seniorManager';
    manager = 'manager';
    assistantManager = 'assistantManager';
    teamLead = 'teamLead';
    techLead = 'techLead';
    projectLead = 'projectLead';
    architect = 'architect';
    seniorDeveloper = 'seniorDeveloper';
    developer = 'developer';
    juniorDeveloper = 'juniorDeveloper';
    internDeveloper = 'internDeveloper';
    qaLead = 'qaLead';
    seniorTester = 'seniorTester';
    tester = 'tester';
    automationTester = 'automationTester';
    devOpsEngineer = 'devOpsEngineer';
    systemAdmin = 'systemAdmin';
    supportEngineer = 'supportEngineer';
    businessAnalyst = 'businessAnalyst';
    productManager = 'productManager';
    scrumMaster = 'scrumMaster';
    uiUxDesigner = 'uiUxDesigner';
    consultant = 'consultant';
    freelancer = 'freelancer';
    trainee = 'trainee';
    others = 'others';
};

type approvalStatus         : String enum {
    approved = 'approved';
    onhold = 'onhold';
    request = 'request';
    cancelled = 'cancelled';
}

type activityStatus         : String enum {
    initiated = 'initiated';
    inprogress = 'inprogress';
    onhold = 'onhold';
    completed = 'completed';
    cancelled = 'cancelled';
}

type activityPriority       : String enum {
    low = 'low';
    medium = 'medium';
    high = 'high';
}

type attachmentType         : String enum {
    employeeResume = 'employeeResume';
    projectrequirements = 'projectRequirements';
}

type MailAttachment         : {
    fileName  : String(100);
    mediaType : String(100);
    file      : LargeBinary;
    fileSize  : Integer;
}

type MailDetails            : {
    to          : array of String;
    cc          : array of String;
    bcc         : array of String;
    subject     : String;
    body        : String;
    attachments : array of MailAttachment;
}

type AttachmentDetails      : {
    fileName  : String(100);
    mediaType : String(100);
    file      : LargeBinary;
    fileSize  : Integer;
}

type EmployeeDetails        : {
    firstName        : String(100);
    lastName         : String(100);
    email            : String(100);
    position         : String(100);
    resume           : array of AttachmentDetails;
    profile          : LargeBinary;
    profileMediaType : String(150);
}

type updateEmployeeDetails  : {
    ID               : String;
    firstName        : String(100);
    lastName         : String(100);
    email            : String(100);
    position         : String(100);
    resume           : array of AttachmentDetails;
    profile          : LargeBinary;
    profileMediaType : String(150);
}

type CorporateDetails       : {
    corporateName : String(100);
    corporateURL  : String(100);
}

type UpdateCorporateDetails : {
    ID            : String;
    corporateName : String(100);
    corporateURL  : String(100);
    activeStatus  : Boolean;
}

type ClientDetails          : {
    clientFirstName : String(100);
    clientLastName  : String(100);
    clientEmail     : String(100);
    corporateID     : String;
}

type UpdateClientDetails    : {
    ID              : String;
    clientFirstName : String(100);
    clientLastName  : String(100);
    clientEmail     : String(100);
    corporateID     : String;
    activeStatus    : Boolean;
}

entity Employee : cuid, managed {
    userName         : String(100);
    firstName        : String(100);
    lastName         : String(100);
    fullName         : String(200);
    email            : String(100);
    creatorName      : String(100);
    modifierName     : String(100);
    position         : employeePosition;
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
}


entity ProjectClient : cuid, managed {
    project : Association to Project;
    client  : Association to Client;
}

entity ProjectApprover : cuid, managed {
    approver       : Association to Employee; // Employee ID
    approvalStatus : approvalStatus;
    description    : String;
    project        : Association to Project;
}


entity ProjectTeam : cuid, managed {
    project      : Association to Project;
    employeeId   : String(100);
    employeeName : String(100);
}

entity ProjectTask : cuid, managed {
    title          : String;
    description    : String;
    project        : Association to one Project;
    assignee       : Association to one Employee;
    team           : Association to one ProjectTeam;
    activityStatus : activityStatus default 'initiated';
    priority       : activityPriority default 'medium';
}

entity ProjectTaskComment : cuid, managed {
    task    : Association to one ProjectTask;
    author  : Association to one Employee;
    content : LargeBinary;
}

// entity ProjectDiscussion : cuid, managed {
//     project : Association to one Project;
//     message : LargeBinary;
// }

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
