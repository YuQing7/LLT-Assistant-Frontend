# Agent Flow Diagrams

This document contains visual flowcharts for the Phase 3 agent system, illustrating the complete test generation pipeline.

## Table of Contents

1. [Complete Pipeline Overview](#complete-pipeline-overview)
2. [Stage 1: Information Gathering](#stage-1-information-gathering)
3. [Stage 2: Test Generation](#stage-2-test-generation)
4. [User Confirmation Flow](#user-confirmation-flow)
5. [Input Validation Flow](#input-validation-flow)
6. [Error Handling Flow](#error-handling-flow)

---

## Complete Pipeline Overview

This diagram shows the high-level flow of the entire test generation system from user action to final test code.

```mermaid
flowchart TD
    Start([User Right-Clicks Function]) --> ExtractCode[Extract Function Context<br/>Phase 2: AST Analysis]
    ExtractCode --> ShowInput[Show Input Dialog]
    ShowInput --> GetDesc{User Provides<br/>Description?}

    GetDesc -->|No| Cancel([Cancelled])
    GetDesc -->|Yes| ValidateInput[Validate Input<br/>InputValidator]

    ValidateInput --> InputValid{Input Valid?}
    InputValid -->|No| ShowError[Show Error Message]
    ShowError --> ShowInput

    InputValid -->|Yes| Stage1[Stage 1 Agent<br/>Identify Scenarios]
    Stage1 --> SkipConfirm{Skip<br/>Confirmation?}

    SkipConfirm -->|Yes| Stage2[Stage 2 Agent<br/>Generate Tests]
    SkipConfirm -->|No| ShowConfirm[Show Confirmation Dialog]

    ShowConfirm --> UserConfirm{User<br/>Confirms?}
    UserConfirm -->|No| Cancel
    UserConfirm -->|Yes, with notes| AddNotes[Add Additional Scenarios]
    UserConfirm -->|Yes| Stage2
    AddNotes --> Stage2

    Stage2 --> InsertCode[Insert Test Code<br/>into Test File]
    InsertCode --> Complete([Complete])

    Stage1 -.->|Error| ErrorHandler[Error Handler]
    Stage2 -.->|Error| ErrorHandler
    ErrorHandler --> ShowError

    style Start fill:#e1f5e1
    style Complete fill:#e1f5e1
    style Cancel fill:#ffe1e1
    style Stage1 fill:#e1e5ff
    style Stage2 fill:#e1e5ff
```

---

## Stage 1: Information Gathering

This diagram details the logic inside the Stage 1 agent for scenario identification.

```mermaid
flowchart TD
    Input[Function Context +<br/>User Description] --> AnalyzeCode[Analyze Code Structure]

    AnalyzeCode --> Branches[Identify Branches]
    AnalyzeCode --> Exceptions[Identify Exceptions]
    AnalyzeCode --> Calls[Identify External Calls]
    AnalyzeCode --> Complexity[Calculate Complexity]

    Branches --> MergeAnalysis[Merge Analysis Results]
    Exceptions --> MergeAnalysis
    Calls --> MergeAnalysis
    Complexity --> MergeAnalysis

    Input --> ParseDesc[Parse User Description]
    ParseDesc --> ExtractScenarios[Extract Mentioned Scenarios]

    MergeAnalysis --> InferScenarios[Infer Missing Scenarios]
    ExtractScenarios --> InferScenarios

    InferScenarios --> ClassifyScenarios[Classify by Confidence<br/>high/medium/low]

    ClassifyScenarios --> IdentifiedList[Identified Scenarios<br/>3-5 high confidence]
    ClassifyScenarios --> SuggestedList[Suggested Scenarios<br/>0-3 medium/low confidence]

    IdentifiedList --> CheckSkip{Should Skip<br/>Confirmation?}
    SuggestedList --> CheckSkip
    Complexity --> CheckSkip
    ParseDesc --> CheckSkip

    CheckSkip -->|Simple Function<br/>Lines < 10<br/>Complexity = 1| Skip[skip_confirmation = true]
    CheckSkip -->|Detailed Description<br/>Length > 100<br/>Covers all branches| Skip
    CheckSkip -->|Otherwise| Ask[skip_confirmation = false<br/>Generate confirmation question]

    Skip --> Output[Stage1Response JSON]
    Ask --> Output

    style Input fill:#fff3cd
    style Output fill:#d4edda
    style CheckSkip fill:#cfe2ff
```

---

## Stage 2: Test Generation

This diagram shows the test code generation process in Stage 2.

```mermaid
flowchart TD
    Input[Function Context +<br/>Confirmed Scenarios] --> AnalyzeScenarios[Analyze Scenario Types]

    AnalyzeScenarios --> NormalPath[Normal Path Tests]
    AnalyzeScenarios --> EdgeCases[Edge Case Tests]
    AnalyzeScenarios --> Exceptions[Exception Tests]
    AnalyzeScenarios --> Boundaries[Boundary Tests]

    NormalPath --> GroupSimilar[Group Similar Scenarios]
    EdgeCases --> GroupSimilar
    Boundaries --> GroupSimilar

    GroupSimilar --> Parametrize{Can Use<br/>Parametrize?}

    Parametrize -->|Yes| CreateParametrized[Create Parametrized Test<br/>@pytest.mark.parametrize]
    Parametrize -->|No| CreateIndividual[Create Individual Tests]

    CreateParametrized --> GenerateCode[Generate Test Functions]
    CreateIndividual --> GenerateCode
    Exceptions --> GenerateCode

    GenerateCode --> AddDocstrings[Add Docstrings]
    AddDocstrings --> AddAssertions[Add Descriptive Assertions]
    AddAssertions --> CheckFixtures{Need<br/>Fixtures?}

    CheckFixtures -->|Yes| CreateFixtures[Create Fixtures]
    CheckFixtures -->|No| CheckMocking
    CreateFixtures --> CheckMocking{Need<br/>Mocking?}

    CheckMocking -->|Yes| AddMocks[Add Mock Decorators]
    CheckMocking -->|No| AddImports
    AddMocks --> AddImports[Add Import Statements]

    AddImports --> ValidateCode[Validate Code<br/>- No placeholders<br/>- Valid syntax<br/>- Count: 3-8 tests]

    ValidateCode --> Output[Stage2Response JSON<br/>test_code + metadata]

    style Input fill:#fff3cd
    style Output fill:#d4edda
    style Parametrize fill:#cfe2ff
    style CheckFixtures fill:#cfe2ff
    style CheckMocking fill:#cfe2ff
```

---

## User Confirmation Flow

This diagram shows the decision tree for when and how to show user confirmation.

```mermaid
flowchart TD
    Stage1Done[Stage 1 Complete] --> CheckSkip{skip_confirmation<br/>= true?}

    CheckSkip -->|Yes| ShowReason[Show Reason in Status<br/>e.g., Simple function]
    ShowReason --> ProceedStage2[Proceed to Stage 2]

    CheckSkip -->|No| BuildQuestion[Build Confirmation Dialog]

    BuildQuestion --> ShowIdentified[Show Identified Scenarios<br/>with checkboxes]
    BuildQuestion --> ShowSuggested[Show Suggested Scenarios<br/>optional checkboxes]

    ShowIdentified --> ShowDialog[Display QuickPick Dialog]
    ShowSuggested --> ShowDialog

    ShowDialog --> UserAction{User Action?}

    UserAction -->|Cancel| CancelPipeline([Cancel Pipeline])
    UserAction -->|Proceed| SelectScenarios[Collect Selected Scenarios]
    UserAction -->|Add More| ShowTextInput[Show Additional Input Box]

    ShowTextInput --> GetNotes[Get Additional Notes]
    GetNotes --> SelectScenarios

    SelectScenarios --> CheckSelected{Any Scenarios<br/>Selected?}

    CheckSelected -->|No| ShowWarning[Show Warning:<br/>No scenarios selected]
    ShowWarning --> UserAction

    CheckSelected -->|Yes| UpdateScenarios[Update Scenario List]
    UpdateScenarios --> ProceedStage2

    ProceedStage2 --> Stage2[Stage 2 Agent]

    style CancelPipeline fill:#ffe1e1
    style ProceedStage2 fill:#d4edda
    style UserAction fill:#cfe2ff
    style CheckSelected fill:#cfe2ff
```

---

## Input Validation Flow

This diagram illustrates how user input is validated and guided to improve quality.

```mermaid
flowchart TD
    UserInput[User Types Description] --> CountChars[Count Characters]
    CountChars --> CheckMin{Length >= 10?}

    CheckMin -->|No| Invalid[isValid = false]
    Invalid --> ShowMinError[Show Error:<br/>Minimum 10 characters]

    CheckMin -->|Yes| CountWords[Count Words]
    CountWords --> DetectScenarios[Detect Scenario Indicators]
    DetectScenarios --> DetectDetails[Detect Specific Details]

    DetectDetails --> ClassifyQuality{Classify Quality}

    ClassifyQuality -->|Length >= 100<br/>Multiple scenarios<br/>Specific details| Level3[Quality: Level 3<br/>Excellent]

    ClassifyQuality -->|Length >= 30<br/>Has scenarios or<br/>8+ words| Level2[Quality: Level 2<br/>Good]

    ClassifyQuality -->|Otherwise| Level1[Quality: Level 1<br/>Minimal]

    Level3 --> Valid[isValid = true<br/>No suggestions]

    Level2 --> Valid2[isValid = true<br/>Optional suggestions]
    Valid2 --> SuggestDetails[Suggest: Add edge cases]

    Level1 --> Valid3[isValid = true<br/>Strong suggestions]
    Valid3 --> SuggestScenarios[Suggest: Add specific scenarios]
    Valid3 --> SuggestExamples[Show Example Descriptions]

    Valid --> Proceed[Proceed to Stage 1]
    SuggestDetails --> Proceed
    SuggestScenarios --> Proceed
    SuggestExamples --> Proceed

    ShowMinError --> RetryInput[User Revises Input]
    RetryInput --> UserInput

    style Invalid fill:#ffe1e1
    style Level3 fill:#d4edda
    style Level2 fill:#d1ecf1
    style Level1 fill:#fff3cd
```

---

## Error Handling Flow

This diagram shows how errors are handled throughout the pipeline.

```mermaid
flowchart TD
    Operation[Agent Operation] --> Success{Success?}

    Success -->|Yes| Continue[Continue Pipeline]

    Success -->|No| CatchError[Catch Error]
    CatchError --> ClassifyError{Error Type?}

    ClassifyError -->|Network Error| CheckRetries{Retries Left?}
    ClassifyError -->|Rate Limit| CheckRetries

    CheckRetries -->|Yes| Wait[Wait with<br/>Exponential Backoff]
    Wait --> Retry[Retry Operation]
    Retry --> Operation

    CheckRetries -->|No| LogError[Log Error Details]

    ClassifyError -->|Auth Error| ShowAuthError[Show: Check API Key]
    ClassifyError -->|Invalid Response| ParseError[Attempt JSON Extraction<br/>from Code Blocks]
    ClassifyError -->|Validation Error| LogError
    ClassifyError -->|Unknown| LogError

    ParseError --> ParseSuccess{Extracted?}
    ParseSuccess -->|Yes| Continue
    ParseSuccess -->|No| LogError

    LogError --> BuildErrorMsg[Build User-Friendly Message]
    BuildErrorMsg --> ShowError[Display Error Dialog]
    ShowError --> OfferRetry{Offer Retry?}

    OfferRetry -->|Yes| UserRetry{User Wants<br/>to Retry?}
    OfferRetry -->|No| Abort

    UserRetry -->|Yes| ResetState[Reset Agent State]
    UserRetry -->|No| Abort[Abort Pipeline]

    ResetState --> Operation
    ShowAuthError --> Abort

    Abort --> Cleanup[Cleanup Resources]
    Cleanup --> End([End])

    Continue --> NextStage[Next Pipeline Stage]

    style Abort fill:#ffe1e1
    style Continue fill:#d4edda
    style ClassifyError fill:#cfe2ff
    style CheckRetries fill:#cfe2ff
```

---

## Component Interaction Diagram

This diagram shows how different components interact during the pipeline execution.

```mermaid
sequenceDiagram
    participant User
    participant VSCode
    participant FlowController
    participant InputValidator
    participant Stage1Builder
    participant Stage2Builder
    participant LLMClient
    participant APIProvider

    User->>VSCode: Right-click function → Generate Tests
    VSCode->>VSCode: Extract function context (Phase 2)
    VSCode->>User: Show input dialog
    User->>VSCode: Enter test description

    VSCode->>FlowController: runFullPipeline(context, description)
    FlowController->>InputValidator: validateUserInput(description)
    InputValidator-->>FlowController: ValidationResult

    alt Input invalid
        FlowController-->>VSCode: Return error
        VSCode->>User: Show error + suggestions
    else Input valid
        FlowController->>Stage1Builder: buildPrompt(context, description)
        Stage1Builder-->>FlowController: BuiltPrompt (system + user)

        FlowController->>LLMClient: callStage1(systemPrompt, userPrompt)
        LLMClient->>APIProvider: POST /chat/completions
        APIProvider-->>LLMClient: JSON response
        LLMClient->>LLMClient: Parse & validate Stage1Response
        LLMClient-->>FlowController: Stage1Response

        alt Skip confirmation
            FlowController->>FlowController: Auto-proceed to Stage 2
        else Need confirmation
            FlowController->>VSCode: Return Stage1Response
            VSCode->>User: Show confirmation dialog
            User->>VSCode: Confirm scenarios
            VSCode->>FlowController: Continue with confirmation
        end

        FlowController->>Stage2Builder: buildPrompt(context, scenarios)
        Stage2Builder-->>FlowController: BuiltPrompt

        FlowController->>LLMClient: callStage2(systemPrompt, userPrompt)
        LLMClient->>APIProvider: POST /chat/completions
        APIProvider-->>LLMClient: JSON response
        LLMClient->>LLMClient: Parse & validate Stage2Response
        LLMClient-->>FlowController: Stage2Response

        FlowController-->>VSCode: PipelineExecutionResult
        VSCode->>VSCode: Insert test code into file
        VSCode->>User: Show success message
    end
```

---

## Data Flow Diagram

This diagram shows how data transforms through the pipeline stages.

```mermaid
flowchart LR
    subgraph Input
        A1[Python Function Code]
        A2[User Description 50-200 chars]
    end

    subgraph Phase2[Phase 2: Code Analysis]
        B1[AST Parser]
        B2[FunctionContext<br/>- Signature<br/>- Branches<br/>- Exceptions<br/>- Complexity]
    end

    subgraph Stage1[Stage 1: Scenario Identification]
        C1[Code Structure Analysis]
        C2[User Intent Parsing]
        C3[Scenario Inference]
        C4[Stage1Response<br/>- Identified scenarios<br/>- Suggested scenarios<br/>- Skip confirmation flag]
    end

    subgraph Confirmation[User Confirmation Optional]
        D1[QuickPick Dialog]
        D2[UserConfirmationResult<br/>- Confirmed flag<br/>- Additional notes]
    end

    subgraph Stage2[Stage 2: Test Generation]
        E1[Test Structure Planning]
        E2[Code Generation]
        E3[Stage2Response<br/>- Test code<br/>- Imports<br/>- Test count<br/>- Coverage summary]
    end

    subgraph Output
        F1[test_module.py<br/>3-8 pytest test cases]
    end

    A1 --> B1
    B1 --> B2
    A2 --> C2
    B2 --> C1
    C1 --> C3
    C2 --> C3
    C3 --> C4

    C4 -.skip=false.-> D1
    D1 --> D2
    C4 -.skip=true.-> E1
    D2 --> E1
    B2 --> E1

    E1 --> E2
    E2 --> E3
    E3 --> F1

    style Input fill:#fff3cd
    style Output fill:#d4edda
    style Stage1 fill:#e1e5ff
    style Stage2 fill:#e1e5ff
    style Confirmation fill:#f8d7da
```

---

## Notes

- **Solid arrows** indicate mandatory flow
- **Dashed arrows** indicate conditional flow
- **Decision nodes** (diamonds) represent branching logic
- **Process nodes** (rectangles) represent operations
- **Terminal nodes** (rounded rectangles) represent start/end points

These diagrams are generated using Mermaid syntax and can be rendered in GitHub, VSCode, or any Mermaid-compatible viewer.
