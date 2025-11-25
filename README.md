# Forge Product Trigger - Jira to n8n Integration

This Forge app integrates Jira with n8n by automatically processing Jira issue creation events and sending data to your n8n workflows.

## What This App Does

This app uses a **Forge Product Trigger** to automatically respond when a new Jira issue is created. It performs the following actions:

### 1. Service Request Detection & Due Date Management
- Detects if a newly created issue is a **service request with approvals**
- Identifies service requests by checking if the issue type name contains `[System] Service request`
- Checks for approval-related fields or approval indicators in the issue
- **Automatically sets the due date to 7 days from the creation date** for service requests that require approvals

### 2. n8n Webhook Integration
- Sends comprehensive issue data to your configured n8n webhook URL
- Includes all relevant issue information:
  - Issue key, ID, summary, description
  - Project details (ID, key, name)
  - Issue type information
  - Reporter details (account ID, display name, email)
  - Status information
  - Timestamps (created, updated, due date)
  - Full event data and cloud ID for context

## How It Works

1. **Trigger**: The app listens for the `avi:jira:created:issue` event
2. **Filter**: Only processes issues that have a summary (non-null)
3. **Processing**: 
   - Checks if the issue is a service request with approvals
   - If yes, sets the due date to 7 days from now
   - Always sends issue data to the n8n webhook
4. **Error Handling**: The app continues processing even if individual steps fail (e.g., if the n8n webhook is unavailable)

## Configuration

### n8n Webhook URL
The app is configured to send data to your n8n webhook. Update the `N8N_WEBHOOK_URL` constant in `src/index.jsx` with your webhook URL, or set it via environment variable:

```bash
forge variables set N8N_WEBHOOK_URL "https://your-n8n-instance.com/webhook/your-webhook-id" --environment development
```

### Service Request Detection
The app detects service requests by:
- Checking if the issue type name contains `[System] Service request` (case-insensitive)
- Looking for approval-related fields or field names containing "approval"

You can customize the detection logic in the `isServiceRequestWithApprovals()` function in `src/index.jsx`.

## Requirements

See [Set up Forge](https://developer.atlassian.com/platform/forge/set-up-forge/) for instructions to get set up.

## Quick Start

### Deploy the App

```bash
forge deploy --non-interactive --environment development
```

### Install the App

```bash
forge install --non-interactive --site <your-site-url> --product jira --environment development
```

### Development with Tunnel

For local development and testing:

```bash
forge tunnel
```

This will proxy invocations locally and allow you to see logs in real-time.

### View Logs

To see what the app is doing:

```bash
forge logs --since 15m
```

## App Permissions

This app requires the following Jira permissions:
- **read:jira-work** - To read issue data
- **write:jira-work** - To update issue due dates

## External Services

The app makes external HTTP requests to:
- Your n8n webhook URL (configured in the code)

Make sure your n8n webhook is:
- **Activated** (not just in test mode)
- **Accessible** from the internet
- **Configured** to receive POST requests with JSON payloads

## Notes

- Use `forge deploy` when you want to persist code changes
- Use `forge install` when you want to install the app on a new site
- Once installed, the site automatically picks up new app changes you deploy
- The app processes issues asynchronously and won't block issue creation if there are errors
- Check the Forge logs if issues aren't being processed as expected

## Support

See [Get help](https://developer.atlassian.com/platform/forge/get-help/) for how to get help and provide feedback.

For more information about Forge, visit [developer.atlassian.com/platform/forge/](https://developer.atlassian.com/platform/forge/).
