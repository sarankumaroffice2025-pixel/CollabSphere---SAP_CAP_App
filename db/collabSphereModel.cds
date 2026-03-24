namespace collabSphere;

using {
    cuid,
    managed
} from '@sap/cds/common';

type employeePosition : String enum {
    admin = 'admin';
    manager = 'manager';
    teamLead = 'teamLead';
    developer = 'developer';
    tester = 'tester';
    others = 'others';
}

type approvalStatus   : String enum {
    approved = 'approved';
    onhold = 'onhold';
    request = 'request';
    cancelled = 'cancelled';
}

type activityStatus   : String enum {
    initiated = 'initiated';
    inprogress = 'inprogress';
    onhold = 'onhold';
    completed = 'completed';
    cancelled = 'cancelled';
}

type activityPriority : String enum {
    low = 'low';
    medium = 'medium';
    high = 'high';
}

type attachmentType   : String enum {
    employeeResume = 'employeeResume';
    projectrequirements = 'projectRequirements';
}

entity Employee : cuid, managed {
    userName  : String(100);
    firstName : String(100);
    lastName  : String(100);
    fullName  : String(100);
    email     : String(100);
    position  : employeePosition;
    priority  : Integer;
    isActive  : Boolean default true;
    resume    : Association to one Asset;
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
                     on attachment.asset = $self
}

entity Attachment : cuid {
    asset     : Association to Asset;
    fileName  : String(150);
    file      : LargeBinary;
    mediaType : String(150);
    fileSize  : Integer;
}
