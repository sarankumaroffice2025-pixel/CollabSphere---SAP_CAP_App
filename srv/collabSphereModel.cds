using collabSphere from '../db/collabSphereModel';

service collaSphere {
    entity collabSphereEmployee        as projection on collabSphere.Employee;
    entity collabSphereProject         as projection on collabSphere.Project;
    entity collabSphereProjectClient   as projection on collabSphere.ProjectClient;
    entity collabSphereProjectAprrover as projection on collabSphere.ProjectApprover;
    entity collabSphereProjectTask     as projection on collabSphere.ProjectTask;
    entity collabSphereTaskComment     as projection on collabSphere.ProjectTaskComment;
    entity collabSphereAsset           as projection on collabSphere.Asset;
}
