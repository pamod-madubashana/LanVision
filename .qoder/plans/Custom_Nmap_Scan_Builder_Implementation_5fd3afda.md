# Custom Nmap Scan Builder Implementation Plan

## Phase 1: Data Model and Validation (Backend)
- Define comprehensive ScanConfig TypeScript interface with all 18+ options
- Create profile presets with default configurations
- Implement robust validation for targets, ports, numeric ranges, and conflicts
- Build secure nmap argument generator with whitelist approach

## Phase 2: Backend API Implementation
- Create new POST /api/scan/builder endpoint
- Implement controller with validation middleware
- Add safety checks for conflicting scan types
- Maintain existing XML parsing and result handling

## Phase 3: Frontend UI Component
- Build ScanBuilder React component with accordion sections
- Implement grouped toggle options (Discovery, Detection, Ports, Speed, Scan Types)
- Add live command preview functionality
- Include validation errors and security warnings

## Phase 4: Shared Logic and Safety
- Create shared command preview generation logic
- Implement privilege requirement warnings
- Add UDP scan performance warnings
- Ensure all validation is consistent between frontend/backend

## Phase 5: Testing and Quality Assurance
- Unit tests for validation functions
- Tests for argument building with various profiles
- Integration tests for API endpoints
- Security testing for injection prevention

## Key Technical Requirements:
1. Use spawn() not exec() for nmap execution
2. Strict whitelist validation for all arguments
3. Shared validation logic between frontend/backend
4. Clear error messages for conflicts and security issues
5. Maintain backward compatibility with existing scan functionality