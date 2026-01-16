# Problem Statement Rewriting Test Materials

## Company & Product Context

**Company:** LearnHub Pro  
**Product/Service:** Online learning platform for professional development courses (video lectures, quizzes, discussion forums, certificates)  
**Business Goal:** Increase course completion rates from 42% to 65% within 6 months and reduce support ticket volume by 30%

---

## Initial Draft Problem Statements (From Product Team)

### Problem Statement Draft #1
"Users are struggling with the video player and getting frustrated, which is hurting our completion rates. We need to make it better."

### Problem Statement Draft #2
"The quiz interface is confusing and people are complaining about it. This is causing problems."

### Problem Statement Draft #3
"Navigation is bad. Users can't find things and it's causing support tickets."

### Problem Statement Draft #4
"Our mobile experience isn't great and users are having issues."

### Problem Statement Draft #5
"The certificate download process needs improvement because users are confused."

---

## Core Research Findings

### Finding 1: Video Control Accessibility Barriers
**Source:** Interviews P03, P07, P11; Support tickets #9245, #9301, #9388

Users navigating with keyboards or screen readers cannot access video playback controls (play, pause, volume, captions, playback speed) that appear only on mouse hover. Controls disappear when focus is lost, interrupting learning flow and forcing users to rely on mouse interaction.

**Key Evidence:**
- P03: "I mostly use keyboard shortcuts when I'm taking notes during videos. But I can't get to the volume or caption settings without grabbing my mouse. It breaks my concentration."
- P07: "I use a screen reader and the video controls just aren't there. I can start the video but I can't pause it or turn on captions without getting help."
- Ticket #9245: "I'm a keyboard-only user and can't access playback speed controls. This makes 2-hour lectures impossible to get through efficiently."

**Impact Metrics:**
- 23% of users who start videos with keyboard navigation abandon before completion
- Average support ticket resolution time: 45 minutes per video accessibility issue
- 67% of screen reader users report video player as primary barrier to course completion

---

### Finding 2: Quiz Answer Selection Motor Precision Requirements
**Source:** Interviews P02, P08, P14; Ethnographic observation with P08; Support tickets #9156, #9209, #9267, #9312

Multiple-choice quiz questions require users to click small radio buttons (8px click target) positioned in close proximity (12px spacing) to select answers. Users with motor control challenges, hand tremors, or using touch interfaces on mobile devices frequently trigger wrong selections, requiring multiple correction attempts.

**Key Evidence:**
- P02: "On my phone, I keep accidentally tapping the wrong answer. The circles are so tiny and close together. I have to zoom in, which then requires scrolling, and I lose track of the question."
- P08 (arthritis): "The little circles you have to click are really hard for me to hit. I sometimes click three or four times before I get the right answer selected. It makes me anxious during timed quizzes."
- P14 ethnographic note: "Participant attempted to select option B, accidentally triggered option C, attempted to correct, triggered option A, took 14 seconds to successfully select intended answer."

**Impact Metrics:**
- Average of 2.3 misclick events per quiz question for users over 55
- 41% of mobile users report quiz interaction difficulty
- Quiz completion time 35% longer for users with reported motor challenges
- 18% quiz abandonment rate correlated with multiple correction attempts

---

### Finding 3: Course Navigation Requires Visual Spatial Memory
**Source:** Interviews P01, P05, P09, P13; Support tickets #9178, #9234, #9289, #9367

The course navigation structure displays as a collapsible sidebar menu with nested modules and lessons indicated by visual indentation and iconography. Users with screen readers report inability to understand course structure hierarchy, while users with cognitive processing differences report losing their place when returning to courses after interruptions.

**Key Evidence:**
- P01: "When I come back to a course after a few days, I can't remember where I left off. The menu shows all the lessons, but nothing tells me which one I was on or which ones I've completed."
- P05: "I use JAWS and the course menu is just a flat list to me. I can't tell which lessons belong to which modules or how the content is organized. I have to guess."
- P09: "If I'm interrupted mid-lesson and close my browser, when I come back, I'm back at the top of the course. I have to scroll and click through to find where I was. Sometimes I just give up and restart."
- P13 (ADHD): "The course outline is overwhelming. There are so many nested dropdowns and I lose track of where I am in the structure. I need breadcrumbs or a progress indicator."

**Impact Metrics:**
- 56% of returning users restart from module 1 instead of resuming progress
- Screen reader users take 3.2x longer to locate specific lessons
- 31% of users who report interruptions mid-course do not return to complete
- Average of 4.7 support contacts per user regarding "where am I in the course"

---

### Finding 4: Mobile Video Transcript Inaccessibility
**Source:** Interviews P04, P06, P12; Survey responses; Support tickets #9198, #9276, #9345

Video transcripts are available only through a small "Transcript" link positioned below the video player, which becomes obscured on mobile viewports when the on-screen keyboard appears for note-taking. Users with hearing impairments, non-native English speakers, and those in sound-sensitive environments cannot access transcripts while simultaneously taking notes or referencing course materials.

**Key Evidence:**
- P04: "I'm deaf and I rely on transcripts. On my phone, if I open the notes section, the transcript link disappears below the keyboard. I have to close my notes to see the transcript, which means I can't take notes and read the transcript at the same time."
- P06: "English isn't my first language. I like to read along with the video to make sure I understand. But on mobile, I can't see the transcript and the video at the same time unless I switch between tabs constantly."
- P12: "I take courses during my lunch break at work. I can't have audio on, so I need the transcript. But the transcript is hidden on my iPad unless I make the video tiny."

**Impact Metrics:**
- 78% of mobile users unaware transcript feature exists
- Users who rely on transcripts complete 2.1x more courses on desktop than mobile
- 42% of users with disclosed hearing impairments abandon courses on mobile devices
- Average mobile session length 60% shorter than desktop for transcript-dependent users

---

### Finding 5: Certificate Generation Relies on Visual Confirmation
**Source:** Interviews P10, P15; Survey responses; Support tickets #9205, #9288, #9321, #9403

Upon course completion, a success message displays for 5 seconds with a "Download Certificate" button, then disappears, replaced by a "Courses" navigation link. Screen reader users and users with slower processing speeds miss the transient notification, resulting in inability to access earned certificates and perception of incomplete course records.

**Key Evidence:**
- P10: "I finished the course and I think I saw something pop up, but it went away before I could read it. I couldn't figure out how to get my certificate. I ended up emailing support."
- P15: "I use VoiceOver and when I completed the course, my screen reader didn't announce anything about a certificate. I had to contact support to find out certificates even existed and how to access them."
- Survey response: "The certificate button vanished before I could click it. I had to retake the final quiz just to make the message appear again."

**Impact Metrics:**
- 34% of course completers do not download certificates on first attempt
- 89% of certificate-related support tickets involve inability to locate download option
- Screen reader users complete certificates 47% less frequently than sighted users
- Average of 2.8 support contacts per certificate issue, averaging 72 hours resolution time

---

### Finding 6: Timed Quiz Progress Not Announced to AT
**Source:** Interviews P07, P11; Support tickets #9267, #9334, #9401

Quizzes with time limits display a visual countdown timer, but the timer does not announce time updates to screen readers until expiration. Users relying on assistive technology cannot pace themselves and experience unexpected quiz submission, resulting in lower scores and course abandonment.

**Key Evidence:**
- P07: "I was taking a timed quiz with my screen reader and had no idea how much time was left. The quiz just suddenly submitted and I failed because I was only halfway through."
- P11: "I use NVDA and the timer doesn't tell me anything. I have to tab over to it manually to check, which wastes time and breaks my focus."
- Ticket #9334: "Screen reader user here. The countdown timer is not accessible. I failed three attempts at the certification quiz because time ran out without warning."

**Impact Metrics:**
- Screen reader users fail timed quizzes at 2.6x the rate of sighted users
- 58% of AT users disable time limits in preferences (when discoverable)
- Quiz retake rate 3.1x higher for screen reader users
- 29% of users with screen readers abandon courses with mandatory timed assessments

---

### Finding 7: Discussion Forum Thread Depth Indiscernible
**Source:** Interviews P05, P09, P13; Ethnographic observation with P13; Survey responses

Discussion forum replies are indicated by horizontal indentation that increases with nesting depth (10px per level). Screen reader users cannot perceive reply hierarchy, while users with cognitive processing differences report difficulty tracking conversation threads beyond 3 levels deep.

**Key Evidence:**
- P05: "With my screen reader, I can't tell if someone is replying to the original post or replying to a reply. The context gets lost and discussions don't make sense."
- P09: "When threads get long, I lose track of who's responding to what. The indentation is subtle and on mobile it's basically invisible."
- P13 (ADHD): "I really want to participate in forums but the nested conversations are too hard to follow. I can't keep track of which comment goes with which."
- Observation note P13: "Participant attempted to reply to a specific comment, became confused by visual indentation, replied to wrong comment in thread, deleted and tried again, ultimately abandoned forum post."

**Impact Metrics:**
- Forum participation rate 71% lower among screen reader users
- Average forum engagement duration 45 seconds for users with cognitive processing challenges vs. 4.2 minutes for other users
- 82% of forum questions receive no responses from AT users
- Mobile forum abandonment rate 67% higher than desktop

---

### Finding 8: Keyboard Trap in Video Note-Taking Feature
**Source:** Interviews P03; Support tickets #9256, #9312, #9389

The in-video note-taking feature allows users to pause and type notes that timestamp to video moments. When accessed via keyboard, focus becomes trapped in the note-taking text area with no keyboard-accessible method to close or save notes and return to video playback controls.

**Key Evidence:**
- P03: "I love taking notes while I watch, but if I'm using my keyboard, once I'm in the notes box, I can't get out. There's no 'Close' button I can tab to. I have to use my mouse to click the X."
- Ticket #9256: "Keyboard user here. The notes feature is a keyboard trap. I can type notes but then I'm stuck. Can't close it, can't save it, can't get back to the video without using a mouse."
- Ticket #9389: "I use keyboard navigation exclusively and the notes feature is unusable. Once I focus in the text area, I'm trapped. This is a WCAG violation."

**Impact Metrics:**
- 100% of keyboard-only users who attempt note-taking report being unable to exit without mouse
- Average of 6.3 minutes spent attempting keyboard navigation before abandoning feature
- Note-taking feature usage 91% lower among reported keyboard-only users
- 23% of keyboard users report avoiding entire courses with heavy note-taking requirements

---

## Business Goals (Provided by Stakeholders)

### Primary Goal
Increase course completion rate from 42% to 65% within 6 months (Q1-Q2 2026)

### Secondary Goals
1. Reduce support ticket volume by 30% (currently averaging 890 tickets/month)
2. Increase mobile course completion rate from 28% to 45%
3. Achieve WCAG 2.1 AA compliance for video player and quiz interfaces by end of Q2 2026
4. Increase certificate download rate from 66% to 85% of course completers
5. Grow forum engagement by 40% (currently 12% of active users participate in forums)

### Success Metrics
- Course completion rate (primary)
- Support tickets per 1,000 active users
- Mobile vs. desktop completion rate parity
- Certificate download rate per completion
- Forum post and reply rates
- Accessibility audit pass rate
- User satisfaction (NPS) among users with disclosed disabilities

---

## User Personas (Relevant to Problem Statements)

### Persona: "The Keyboard Power User"
**Representative Users:** P03, P11  
**Characteristics:**
- Uses keyboard navigation for efficiency and accessibility
- May be blind, have low vision, or have motor impairments limiting mouse use
- Relies on screen readers (JAWS, NVDA, VoiceOver) or keyboard-only navigation
- Expects full functionality without mouse interaction

**Needs:**
- All interactive elements keyboard-accessible
- Logical focus order and visible focus indicators
- No keyboard traps
- Screen reader announcements for dynamic content

---

### Persona: "The Mobile Learner"
**Representative Users:** P02, P04, P06, P12  
**Characteristics:**
- Primarily accesses courses on smartphone or tablet
- Often in sound-sensitive or variable noise environments
- May have hearing impairments or be non-native English speakers
- Limited screen space requires thoughtful prioritization

**Needs:**
- Touch targets minimum 44x44px
- Critical features accessible without scrolling
- Transcript and caption availability
- Responsive layouts that adapt to viewport constraints

---

### Persona: "The Focus-Challenged Learner"
**Representative Users:** P01, P09, P13  
**Characteristics:**
- May have ADHD, anxiety, or other cognitive processing differences
- Easily overwhelmed by information density
- Frequently interrupted during learning sessions
- Struggles with visual memory and spatial navigation

**Needs:**
- Clear progress indicators and breadcrumbs
- Ability to resume where they left off
- Simplified visual hierarchy
- Reduced cognitive load in navigation

---

## Example Problem Statement Rewrites (Reference Only - Not for Direct Use)

**Example of Strong Rewrite:**
*Based on Finding 1:* "Keyboard-only users cannot access video playback controls (volume, captions, playback speed) that appear only on mouse hover, resulting in inability to adjust settings without switching to mouse input and 23% abandonment rate for keyboard-initiated video sessions."

**Example of Weak Rewrite:**
*Based on Finding 1:* "The video player needs better accessibility features to improve the user experience for people with disabilities."

---

## End of Test Materials

*These materials are designed to test your problem statement rewriting prompt. Each finding contains specific user groups, observable behaviors, contexts, failure points, and measurable impacts. The draft problem statements are intentionally vague and solution-oriented. Your prompt should transform these into clear, testable, accessibility-aware problem statements that identify the user, context, observed failure, and downstream impact, based strictly on the research findings and business goals provided.*