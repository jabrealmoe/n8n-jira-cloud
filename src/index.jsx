import api, { route } from '@forge/api';

// n8n webhook URL - configured via environment variable
// Set different URLs for each environment using: forge variables:set N8N_WEBHOOK_URL <url> --environment <env>
// This allows you to use test URLs in development and production URLs in production
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://jabreal.app.n8n.cloud/webhook/3a386c57-e834-4b90-81d9-02ddf5bb027d';

const WEBTRIGGER_API_KEY = process.env.WEBTRIGGER_API_KEY || 'your-secret-api-key-change-this';

function isServiceRequestWithApprovals(issue) {
        const issueTypeName = issue.fields.issuetype?.name?.toLowerCase() || '';

        const isServiceRequest = issueTypeName.includes('[System] Service request');

        if (!isServiceRequest) {
                return false;
        }


        const hasApprovalInName = issueTypeName.includes('approval');
        const hasApprovalField = issue.fields.approval !== undefined ||
                                 issue.fields.approvalStatus !== undefined ||
                                 Object.keys(issue.fields).some(key => 
                                        key.toLowerCase().includes('approval')
                                 );

        return hasApprovalInName || hasApprovalField;
}

function getDateSevenDaysFromNow() {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
}

export async function run(event, context) {
        console.log(event);
        console.log(context);
       

        const issue = event.issue;
        const issueKey = issue.key;

        try {
                // Check if this is a service request with approvals
                const isServiceRequestApproval = isServiceRequestWithApprovals(issue);
                console.log(`Issue ${issueKey} is service request with approvals:`, isServiceRequestApproval);

                // If it's a service request with approvals, set the due date to 7 days from today
                if (isServiceRequestApproval) {
                        const dueDate = getDateSevenDaysFromNow();
                        console.log(`Setting due date for ${issueKey} to:`, dueDate);

                        try {
                                const updateResponse = await api.asApp().requestJira(
                                        route`/rest/api/3/issue/${issueKey}`,
                                        {
                                                method: 'PUT',
                                                headers: {
                                                        'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify({
                                                        fields: {
                                                                duedate: dueDate
                                                        }
                                                })
                                        }
                                );

                                console.log('Successfully updated due date:', updateResponse);
                        } catch (dueDateError) {
                                console.error('Error updating due date:', dueDateError);
                                // Continue execution even if due date update fails
                        }
                }

                // Call n8n webhook with original issue data
                try {
                        console.log('Calling n8n webhook...');
                        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
                                method: 'POST',
                                headers: {
                                        'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                        // Send original issue data to n8n (not modified)
                                        issueKey: issue.key,
                                        issueId: issue.id,
                                        summary: issue.fields.summary,
                                        description: issue.fields.description,
                                        project: {
                                                id: issue.fields.project?.id,
                                                key: issue.fields.project?.key,
                                                name: issue.fields.project?.name
                                        },
                                        issueType: {
                                                id: issue.fields.issuetype?.id,
                                                name: issue.fields.issuetype?.name
                                        },
                                        reporter: {
                                                accountId: issue.fields.reporter?.accountId,
                                                displayName: issue.fields.reporter?.displayName,
                                                emailAddress: issue.fields.reporter?.emailAddress
                                        },
                                        status: {
                                                id: issue.fields.status?.id,
                                                name: issue.fields.status?.name
                                        },
                                        created: issue.fields.created,
                                        updated: issue.fields.updated,
                                        dueDate: issue.fields.duedate,
                                        // Include the full event for maximum flexibility
                                        fullEvent: event,
                                        // Include context information
                                        cloudId: context.cloudId,
                                        timestamp: new Date().toISOString()
                                })
                        });

                        if (n8nResponse.ok) {
                                const n8nData = await n8nResponse.json().catch(() => n8nResponse.text());
                                console.log('Successfully sent data to n8n:', n8nData);
                        } else {
                                const errorText = await n8nResponse.text();
                                let errorMessage;
                                try {
                                        const errorJson = JSON.parse(errorText);
                                        errorMessage = errorJson.message || errorText;
                                        // Provide helpful message for common n8n errors
                                        if (n8nResponse.status === 404 && errorJson.message?.includes('not registered')) {
                                                console.warn('⚠️ n8n webhook is not active. Please activate/publish your workflow in n8n.');
                                                console.warn('   In test mode, webhooks only work for one call after clicking "Execute workflow".');
                                                console.warn('   To fix: Go to your n8n workflow and click "Activate" to make it production-ready.');
                                        }
                                } catch {
                                        errorMessage = errorText;
                                }
                                console.error(`n8n webhook returned error (${n8nResponse.status} ${n8nResponse.statusText}):`, errorMessage);
                        }
                } catch (n8nError) {
                        // Don't fail the entire trigger if n8n call fails
                        // Log it but continue execution
                        console.error('Error calling n8n webhook:', n8nError);
                }

        } catch (error) {
                console.error('Error processing issue:', error);
                // Log the full error details for debugging
                if (error.body) {
                        console.error('Error body:', await error.body.text());
                }
        }
}
