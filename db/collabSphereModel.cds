namespace collabSphere;

using {
    cuid,
    managed
} from '@sap/cds/common';

type employeePosition  : String enum {
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

type approvalStatus    : String enum {
    approved = 'approved';
    onhold = 'onhold';
    request = 'request';
    cancelled = 'cancelled';
}

type activityStatus    : String enum {
    initiated = 'initiated';
    inprogress = 'inprogress';
    onhold = 'onhold';
    completed = 'completed';
    cancelled = 'cancelled';
}

type activityPriority  : String enum {
    low = 'low';
    medium = 'medium';
    high = 'high';
}

type attachmentType    : String enum {
    employeeResume = 'employeeResume';
    projectrequirements = 'projectRequirements';
}

type AttachmentDetails : {
    fileName  : String(100);
    mediaType : String(100);
    file      : LargeBinary;
    fileSize  : Integer;
}

type EmployeeDetails   : {
    firstName : String(100);
    lastName  : String(100);
    email     : String(100);
    position  : String(100);
    resume    : array of AttachmentDetails;
}

entity Employee : cuid, managed {
    userName  : String(100);
    firstName : String(100);
    lastName  : String(100);
    fullName  : String(100);
    email     : String(100);
    position  : employeePosition;
    isActive  : Boolean default true;
}

entity Project : cuid, managed {
    title          : String;
    description    : String;
    startDate      : Date;
    endDate        : Date;
    approvedStatus : approvalStatus;
    budget         : Decimal(25, 25);
    clients        : Association to many ProjectClient
                         on clients.project = $self;
    approvers      : Association to many ProjectApprover
                         on approvers.project = $self;
}

entity ProjectClient : cuid, managed {
    project   : Association to Project;
    firstName : String(100);
    lastName  : String(100);
    fullName  : String(100);
    email     : String(100);
}

entity ProjectApprover : cuid, managed {
    approver       : String(100); // Employee ID
    project        : Association to Project;
    approvalStatus : approvalStatus;
    description    : String;
}


entity ProjectTeam : cuid, managed {
    project      : String(100);
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
    assetid    : String(100); //It can be the Employee id or project id to get the attachment details of the particular Employee or Project
    assetType  : attachmentType;
    attachment : Association to many Attachment
                     on attachment.attachmentAsset = $self
}

entity Attachment : cuid {
    attachmentAsset     : Association to Asset;
    fileName  : String(150);
    file      : LargeBinary;
    mediaType : String(150);
    fileSize  : Integer;
}
