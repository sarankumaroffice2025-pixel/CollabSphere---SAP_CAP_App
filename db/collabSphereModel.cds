namespace collabSphere;

using {
    cuid,
    managed
} from '@sap/cds/common';

type employeePosition : Integer enum {
    admin = 0;
    manager = 1;
    teamLead = 2;
    developer = 3;
    tester = 4;
    others = 5;
}

type approvalStatus   : Integer enum {
    approved = 1;
    onhold = 2;
    request = 3;
    cancelled = 4;
}

type activityStatus   : Integer enum {
    initiated = 1;
    inprogress = 2;
    onhold = 3;
    completed = 4;
    cancelled = 5;
}

type activityPriority : Integer enum {
    low = 1;
    medium = 2;
    high = 3;
}

type attachmentType   : Integer enum {
    employeeResume = 1;
    projectrequirements = 2;
}

entity collabSphereEmployee : cuid, managed {
    employeeName : String(100);
    firstName    : String(100);
    lastName     : String(100);
    fullName     : String(100);
    email        : String(100);
    position     : employeePosition;
    priority     : Integer;
    isActive     : Boolean default true;
    resume       : Association to one collabSphereAsset;
}

entity collabSphereProject : cuid, managed {
    title          : String;
    description    : String;
    companyName    : String(200);
    companySite    : String;
    startDate      : Date;
    endDate        : Date;
    approvedStatus : approvalStatus;
    budget         : Decimal(100, 50);
    clients        : Association to many collabSphereProjectClient
                         on clients.project = $self;
    approvers      : Association to many collabSphereProjectApprover
                         on approvers.project = $self;
}

entity collabSphereProjectClient : cuid, managed {
    project   : Association to collabSphereProject;
    firstName : String(100);
    lastName  : String(100);
    fullName  : String(100);
    email     : String(100);
}

entity collabSphereProjectApprover : cuid, managed {
    approver       : String(100); // Employee ID
    project        : Association to collabSphereProject;
    approvalStatus : approvalStatus;
    description    : String;
}


entity collabSphereProjectTeam : cuid, managed {
    project     : Association to many collabSphereProject;
    projectTeam : Association to many collabSphereEmployee;
}

entity collabSphereTaskMangement : cuid, managed {
    title          : String;
    description    : String;
    activityStatus : activityStatus default 1;
    projectTeam    : String(100);
    project        : String(100);
    assignee       : String(100);
    assigneeName   : String(200);
    priority       : activityPriority default 1;
}

// entity collabSphereProjectDiscussion : cuid, managed {
//     project : Association to one collabSphereProject;
//     message : LargeBinary;
// }

entity collabSphereAsset : cuid, managed {
    assetid   : String(100); //It can be the Employee id or project id to get the attachment details of the particular Employee or Project
    assetType : attachmentType;
}

entity collabSphereAttachment : cuid {
    asset     : Association to one collabSphereAsset;
    fileName  : String(150);
    file      : LargeBinary;
    mediaType : String(150);
    fileSize  : Integer;
}
