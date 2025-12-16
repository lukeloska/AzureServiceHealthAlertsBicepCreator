resource serviceHealthAlert 'Microsoft.Insights/activityLogAlerts@2023-01-01-preview' = {
  name: 'aada'
  location: 'global'
  properties: {
    enabled: true
    scopes: ['/subscriptions/00000000-0000-0000-0000-000000000000']
    condition: {
      allOf: [
        {
          field: 'category'
          equals: 'ServiceHealth'
        }
        {
          field: 'properties.impactedServices[*].ServiceName'
          equals: 'Advisor'
        }
        {
          anyOf: [
            {
              field: 'properties.incidentType'
              equals: 'ServiceIssue'
            }
          ]
        }
        {
          anyOf: [
            {
              field: 'properties.impactedServices[*].ImpactedRegions[*].RegionName'
              equals: 'australiaeast'
            }
          ]
        }
      ]
    }
    actions: {
      actionGroups: [
        {
          actionGroupId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dadsad/providers/microsoft.insights/actionGroups/dadsa'
        }
      ]
    }
    description: 'Service Health alert for Advisor (ServiceIssue) in australiaeast'
  }
}
