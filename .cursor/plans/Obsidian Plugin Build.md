<!-- fa5673e6-0953-4fbc-8abe-a2c377dbd470 05a123a6-5d96-4eea-93ec-e4859aa153a7 -->
# GetShitDone Plugin Rebuild

## Architecture

```mermaid
flowchart TD
    subgraph triggers [Triggers]
        Templater[Templater Template]
        Command[Obsidian Commands]
        FileOpen[File Open Event]
        AdvURI[Advanced URI]
    end
    
    subgraph plugin [Plugin Core]
        Main[main.ts]
        Settings[settings.ts]
        Debug[DebugLogger]
    end
    
    subgraph actions [Actions]
        DailyNote[generateDailyNote]
        PersonRes[researchPerson]
        OrgRes[researchOrg]
        Briefing[generateBriefing]
	PhoneNumber [findPhoneNumber]
    end
    
    subgraph services [Services]
        Google[GoogleServices]
        Calendar[CalendarService]
        VaultSearch[VaultSearchService]
    end
    
    Templater -->|api.generateDailyNote| Main
    Command -->|command palette| Main
    FileOpen -->|settings.autoResearch| Main
    AdvURI -->|commandid param| Command
    
    Main --> actions
    actions --> services
    services -->|Gemini + Gmail| Google
    services -->|Google Calendar Plugin| Calendar
```

## File Structure

```
getshitdone-plugin/
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── styles.css
└── src/
    ├── main.ts                 # Plugin entry, commands, file-open handler
    ├── settings.ts             # Settings tab UI
    ├── types.ts                # TypeScript interfaces
    ├── services/
    │   ├── google-services.ts  # Gemini, Gmail, Drive APIs
    │   ├── calendar.ts         # Wrapper for google-calendar plugin
    │   └── vault-search.ts     # Search vault for context
    ├── actions/
    │   ├── daily-note.ts       # Generate daily note + trigger research
    │   ├── person-research.ts  # Research person (includes phone lookup)
    │   ├── org-research.ts     # Research organization
    │   └── meeting-briefing.ts # Generate meeting briefing
    └── ui/
        ├── debug-modal.ts      # Debug log viewer
        └── status-bar.ts       # Status bar indicator
```

## Settings Structure (Explicit)

All triggers and behavior explicitly configurable:

```typescript
interface PluginSettings {
  // API Configuration
  geminiApiKey: string;
  appsScriptUrl: string;
  appsScriptSecret: string;
  
  // Identity (for filtering)
  yourDomain: string;              // "finn.com"
  excludeEmails: string[];         // Your emails to exclude
  excludeNames: string[];          // Names to exclude from attendees
  
  // Folder Paths
  dailyNotesFolder: string;        // "Daily notes"
  peopleFolder: string;            // "People"
  organizationsFolder: string;     // "Organizations"
  meetingsFolder: string;          // "Meetings"
  
  // Triggers (EXPLICIT)
  triggers: {
    autoResearchPeopleOnOpen: boolean;   // Default: true
    autoResearchOrgsOnOpen: boolean;     // Default: true
  };
  
  // Meeting Behavior
  excludeTitles: string[];         // Skip entirely: "Blocker", "Lunch"
  skipBriefingPatterns: string[];  // List but no briefing: "standup", "board meeting"
  maxListedParticipants: number;   // Default: 10
  
  // Prompts (editable in settings)
  prompts: {
    meetingFilter: string;
    meetingBriefing: string;
    personResearch: string;
    orgResearch: string;
    phoneValidation: string;
  };
  
  // Debug
  debug: {
    enabled: boolean;
    showStatusBar: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}
```

## Workflows

### 1. Generate Daily Note (Templater API)

**Trigger:** Templater template calls `app.plugins.plugins["getshitdone"].api.generateDailyNote(tp)`

**Flow:**

1. Fetch today's events from Google Calendar plugin
2. Filter events (exclude titles, declined events)
3. For each meeting:

   - Create meeting link with event ID
   - Ensure People notes exist for external attendees (create if missing)
   - Queue briefing generation for external/important meetings

4. Return formatted meeting list immediately
5. Process briefing queue async (insert "Researching..." then replace with briefing)

**Key code from `chief_of_staff.js`:**

- `generateDailyNote()` lines 185-253
- `processQueue()` lines 272-424 (briefing generation)
- `ensurePeopleNotes()` lines 74-138

### 2. Research Person (Command + Auto on Open)

**Triggers:**

- Command: "GetShitDone: Research Person" (runs on active People note)
- Auto: File open event when `triggers.autoResearchPeopleOnOpen` is true

**Flow:**

1. Check if already researched (frontmatter `researched: true`)
2. Get/find email (frontmatter or Gmail search by name)
3. Gather context: Gmail history, vault mentions
4. Find phone number from email signatures (integrated from `find_phone_number.js`)
5. Generate briefing via Gemini with Google Search
6. Handle organization linking (find or create Org note)
7. Update frontmatter: Email, Title, Organization, Location, Phone
8. Append research summary

**Key code from `person_researcher.js`:**

- `researchFile()` lines 47-119
- `generateBriefing()` lines 298-389
- `handleOrganization()` lines 394-437

**Integrated from `find_phone_number.js`:**

- Phone pattern matching from signatures (lines 84-98)
- Gemini validation prompt (lines 177-194)
- Make sure that phone number finding is also triggerable by itself.

### 3. Research Organization (Command + Auto on Open)

**Triggers:**

- Command: "GetShitDone: Research Organization" (runs on active Org note)
- Auto: File open event when `triggers.autoResearchOrgsOnOpen` is true

**Flow:**

1. Check if already researched
2. Search vault for context (mentions, linked People)
3. Generate briefing via Gemini with Google Search
4. Update note with research, mark as researched

**Key code from `org_researcher.js`:**

- `researchExistingOrg()` lines 63-95
- `generateBriefing()` lines 160-204

### 4. Manual Briefing Trigger (Command)

**Trigger:** Command: "GetShitDone: Generate Briefing for Current Line"

**Flow:**

1. Get current line from editor
2. Extract meeting link and event ID
3. Fetch event from calendar
4. Run briefing generation (same as daily note queue processing)

## Commands Registered

| Command ID | Name | Description |

|------------|------|-------------|

| `research-person` | Research Person | Run on current People note |

| `research-org` | Research Organization | Run on current Org note |

| `trigger-briefing` | Generate Briefing | For current meeting line |

| `open-debug-log` | View Debug Log | Opens debug modal |

| `rerun-research` | Re-research (Force) | Force re-research current note |

## Debug System

1. **Console logging:** All operations logged with `[GSD]` prefix, respects `debug.logLevel`
2. **Status bar:** Shows current operation ("Researching John Doe...", "Generating briefing...")
3. **Debug modal:** Scrollable log viewer, accessed via command or settings

## Key Implementation Details

### File Open Handler (main.ts)

```typescript
this.registerEvent(
  this.app.workspace.on('file-open', async (file) => {
    if (!file) return;
    
    const settings = this.settings;
    
    // People auto-research
    if (settings.triggers.autoResearchPeopleOnOpen && 
        file.path.startsWith(settings.peopleFolder + '/')) {
      const content = await this.app.vault.read(file);
      if (!this.isAlreadyResearched(content)) {
        await this.actions.researchPerson(file.path);
      }
    }
    
    // Org auto-research (same pattern)
  })
);
```

### Templater API (main.ts)

```typescript
// Expose API for Templater
(this as any).api = {
  generateDailyNote: (tp: any) => this.actions.generateDailyNote(tp)
};
```

### Settings Tab UI Sections

1. **API Configuration** - Password fields for keys/secrets
2. **Identity** - Your domain, excluded emails/names, manage each as "tags"
3. **Folders** - Path pickers for each folder
4. **Triggers** - Toggle switches for auto-research behaviors
5. **Meeting Filters** - Comma-separated lists for excludes, manage and display each as tags
6. **Prompts** - Collapsible textareas for each prompt
7. **Debug** - Enable toggle, log level dropdown, "View Log" button

## Migration from Scripts

The plugin ports all functionality from:

- `google_services.js` → `services/google-services.ts`
- `chief_of_staff.js` → `actions/daily-note.ts` + `actions/meeting-briefing.ts`
- `person_researcher.js` + `find_phone_number.js` → `actions/person-research.ts`
- `org_researcher.js` → `actions/org-research.ts`

### To-dos

- [ ] Create plugin scaffold: manifest.json, package.json, tsconfig, esbuild config
- [ ] Define TypeScript interfaces for settings, prompts, and debug types
- [ ] Port google_services.js to TypeScript service class
- [ ] Port chief_of_staff.js generateDailyNote and processQueue to daily-note.ts
- [ ] Port person_researcher.js + find_phone_number.js to person-research.ts
- [ ] Port org_researcher.js to org-research.ts
- [ ] Build debug logger, status bar indicator, and debug modal
- [ ] Build settings tab with all explicit configuration sections
- [ ] Wire up main.ts: commands, file-open handler, Templater API