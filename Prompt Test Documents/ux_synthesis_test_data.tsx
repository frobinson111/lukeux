import React, { useState } from 'react';
import { Download, FileText, Users, Package } from 'lucide-react';

const UXTestDataGenerator = () => {
  const [selectedScenario, setSelectedScenario] = useState('healthcare');

  const scenarios = {
    healthcare: {
      name: "HealthConnect Patient Portal",
      description: "HIPAA-compliant patient portal for accessing medical records, scheduling appointments, and secure messaging",
      company: "Regional Medical Group",
      inputs: {
        interviews: `INTERVIEW #1 - Patient Maria, Age 67, Screen Reader User
Interviewer: Walk me through how you tried to refill your prescription last week.
Maria: Well, I logged in fine, that part works. But then I went to medications, and it just listed everything. Twenty-three medications! I need my blood pressure one, but I had to listen to all of them. Took me maybe ten minutes just to find the right one. And then... where's the refill button? My screen reader said "link" but didn't say what it was for. I clicked it and nothing happened that I could tell. Had to call the pharmacy directly.

Interviewer: What did you expect to happen?
Maria: I thought there'd be a search, you know? Type "blood pressure" or "lisinopril" and find it fast. Or maybe it could remember which ones I refill every month and put those first.

INTERVIEW #2 - Patient James, Age 34, Mobile User
Interviewer: Tell me about trying to schedule your follow-up appointment.
James: It was frustrating. I opened the app on my phone during my lunch break. The calendar showed available slots, but when I tapped one, it asked me to pick a doctor first. So I went back, picked my doctor, then it showed the calendar again but different times. Then it asked for my insurance info even though that's already in my profile. I gave up and just called. The whole thing felt backwards.

Interviewer: What would have made more sense?
James: Just ask me everything upfront - who I'm seeing, what it's for, my insurance - then show me times that actually work. Don't make me bounce around.

INTERVIEW #3 - Patient Linda, Age 52, Cognitive Disability (TBI)
Interviewer: You mentioned having trouble with the secure messaging feature?
Linda: Yes. I wanted to ask my doctor about my test results. I found the message button, started typing, but then it had this timer. Like a countdown. It said I had 15 minutes to finish my message or it would log me out for security. But I need time to think about how to word things. My brain doesn't work as fast since my accident. I lost my message twice before I just wrote something quick that probably didn't make sense.

Interviewer: How did that make you feel?
Linda: Stupid. Like I'm too slow for the system. I ended up calling the office, but they said to use the portal because the doctor prefers written messages.

INTERVIEW #4 - Caregiver David, Age 71, Managing Mother's Account
Interviewer: How do you help your mother manage her healthcare through the portal?
David: I'm her caregiver, but the system doesn't really acknowledge that. I have her username and password - I know I'm not supposed to, but how else? When I log in as her, all the notifications and reminders are written like she's reading them. "You have an appointment" - but she has dementia. She's not reading anything. I need a way to manage her account as her caregiver officially, with reminders sent to me, not her.

INTERVIEW #5 - Patient Sarah, Age 28, Anxiety Disorder
Sarah: The lab results section is really stressful. Numbers just appear with no context. Last month, my cholesterol results showed up flagged in red as "high" but my doctor hadn't reviewed them yet. I spent a whole weekend panicking, googling, convinced I was dying. When I finally talked to my doctor, she said it was barely above normal and nothing to worry about given my age and overall health. Why show me results before the doctor has a chance to provide context?

INTERVIEW #6 - Patient Robert, Age 45, Low Digital Literacy
Robert: I still don't understand what half the buttons do. There's "Summary," "Details," "Chart," "Report" - aren't those all the same thing? And when I download something, I don't know where it goes. My son has to help me find files on my computer. I just want to see what the doctor wrote about my visit in plain language.

INTERVIEW #7 - Patient Aisha, Age 38, Keyboard-Only User
Aisha: I navigate everything with keyboard because of my motor disability. The portal is mostly okay, but the appointment calendar is impossible. I can tab to it, but once I'm in the calendar grid, I can't move between dates. It just tabs me out to the next element. I have to use my phone and struggle with the tiny touch targets instead.`,

        supportTickets: `TICKET #HC-1891 - Priority: Medium
User: PatientUser_8472
Subject: Can't upload documents for prior authorization
Description: Trying to upload my doctor's referral letter for my upcoming procedure. The upload button doesn't work with Dragon voice control software. Have tried 5 times. Authorization deadline is in 3 days. Very stressed about this.
Status: Resolved - advised to email documents instead
Agent Notes: Button uses non-standard click handler that doesn't trigger via accessibility API. Known issue, no fix timeline.

TICKET #HC-2103 - Priority: High  
User: PatientUser_3291
Subject: Logged out during bill payment
Description: Entered all my credit card info to pay $350 bill. Got a phone call, came back 3 minutes later and it logged me out. Had to start over but now it says payment pending? Did I get charged twice?
Status: Escalated to Billing
Agent Notes: Session timeout is 5 minutes during payment flow. User was charged once but system doesn't confirm this clearly post-timeout.

TICKET #HC-2456 - Priority: Low
User: PatientUser_7834  
Subject: What do the icons mean?
Description: There are symbols next to my appointments but no explanation. One looks like a video camera, one is a building, one is papers? Are these supposed to tell me something?
Status: Resolved - sent icon legend
Agent Notes: Telehealth vs in-person indicators. No tooltips or legend in UI. This is the 14th ticket about icon meanings this quarter.

TICKET #HC-2891 - Priority: Critical
User: PatientUser_1047
Subject: Cannot access portal - urgent medical need
Description: My mother fell and I'm at the ER. They need her medication list and allergy information. I can log into her account but the medications page just shows a spinning wheel. Been trying for 20 minutes. Had to try to remember everything from memory.
Status: Resolved - server timeout issue
Agent Notes: Page was loading 89 medications with full history. Took 45+ seconds, appeared frozen. No loading state indication. No way to export/print medication list in advance for emergencies.

TICKET #HC-3124 - Priority: Medium
User: PatientUser_5520
Subject: Message notifications don't make sense
Description: I got an email that said "You have a new secure message" but when I logged in there was nothing new. This happens constantly. I don't trust the notifications anymore so I log in multiple times a day to check manually.
Status: Open - investigating
Agent Notes: Notification sends when doctor STARTS a message but may not finish it until later. User sees notification but message isn't actually sent yet. Confusing workflow.

TICKET #HC-3287 - Priority: Medium
User: PatientUser_9104
Subject: Can't understand after-visit summary
Description: Downloaded the summary from my appointment. It's full of medical codes and abbreviations. "R51" "HTN" "Dx" - I have no idea what my doctor actually said about my headaches. Why can't this be in normal English?
Status: Resolved - explained medical shorthand  
Agent Notes: After-visit summaries auto-generate from clinical notes. No patient-friendly translation layer. User has 8th grade reading level per account settings but system doesn't adapt language.`,

        survey: `SURVEY QUESTION: What is the most frustrating part of using the patient portal?
[Open-ended responses, n=247]

Response ID: S-0847
"The constant logging in. If I leave for even a few minutes I have to enter my password again. I have 15 character passwords for security and typing that on my phone 5 times in one session is maddening."

Response ID: S-0923  
"I can never find anything. Is my upcoming appointment in Messages, or Calendar, or Appointments, or Visits? They all seem like they should be the same place but they're not."

Response ID: S-1056
"Everything is separate. I have to log into one portal for my primary care doctor, a different one for my specialist, and another for my kids' pediatrician. Why can't it all be together?"

Response ID: S-1203
"The medical jargon. I don't have a medical degree. Tell me what's wrong with me in words I can understand."

Response ID: S-1445
"I'm visually impaired and use screen magnification. The portal forces me to scroll horizontally to read full lines of text when I zoom in. Every single line. It's exhausting."

Response ID: S-1672
"You can't save a message as a draft. I wanted to write a detailed message to my doctor about my symptoms but had to do it all in one sitting or lose it."

Response ID: S-1789
"The test results show up as PDFs that are just scanned images. My screen reader can't read them at all. I have to ask my husband to read me my own medical results."

Response ID: S-1834
"I wanted to share my records with my new doctor but there's no easy way to export everything. I had to download like 40 different files one by one."

Response ID: S-2091  
"When I'm looking at my upcoming appointments, there's no way to tell which doctor I'm seeing. It just says 'Medical Appointment' with a date and time. I have to click into each one to see if it's my cardiologist or my endocrinologist."

Response ID: S-2156
"The mobile app and website look completely different and have things in different places. I start something on my computer and can't figure out how to finish it on my phone."`,

        ethnographic: `ETHNOGRAPHIC OBSERVATION SESSION #1
Date: October 15, 2024
Participant: Eleanor, Age 73, Parkinson's Disease
Setting: Participant's home, using iPad at kitchen table
Observer: Researcher Janet K.

[10:34 AM] Eleanor opens Safari and navigates to HealthConnect. Home screen has bookmark.
[10:35 AM] Login page loads. Eleanor positions iPad against a cookbook for stability. Hand tremor visible.
[10:36 AM] Attempts to tap username field - takes 3 attempts due to tremor and small tap target. Verbalizes frustration: "Come on..."
[10:37 AM] Successfully focused on username field. Begins typing using on-screen keyboard with index finger, one key at a time.
[10:39 AM] Typing takes 2 minutes. Several typos, uses backspace frequently.
[10:39 AM] Moves to password field. Field is masked so she can't see what she's typing.
[10:41 AM] After entering password, taps "Login" button - no response. Taps again, harder. Still no response.
[10:41 AM] Eleanor: "Is this thing frozen?" Checks WiFi connection.
[10:42 AM] Login button appears to require precise tap on text, not the full button area. After 4th attempt, successfully logs in.
[10:43 AM] Home screen loads. Eleanor pauses, looking at screen. "Now where do I go?"
[10:44 AM] Taps "Appointments" in navigation menu.
[10:44 AM] Page loads with list of past and future appointments in chronological order. Eleanor scrolls down slowly.
[10:46 AM] Eleanor: "I need to cancel next week's appointment... where is it?" Continues scrolling.
[10:47 AM] Passes the appointment she's looking for, scrolls back up, passes it again.
[10:48 AM] Finds appointment. Taps on appointment card to expand details.
[10:49 AM] Details expand in-place. Eleanor looking for cancel option. "How do I cancel this?"
[10:50 AM] Scrolls within expanded appointment card. Cancel option is at bottom after insurance info, location, preparation instructions.
[10:51 AM] Finds "Cancel Appointment" link. Taps - takes 2 attempts.
[10:51 AM] Modal dialog appears: "Are you sure you want to cancel? This action cannot be undone." Two buttons: "Go Back" and "Yes, Cancel"
[10:52 AM] Eleanor reads dialog aloud to herself twice, appears uncertain.
[10:53 AM] Taps "Yes, Cancel" - but hits "Go Back" instead due to tremor. Modal closes.
[10:53 AM] Eleanor: "Oh no, what did I do?" Checks if appointment is still there.
[10:54 AM] Appointment still listed. "Okay, I have to try again."
[10:54 AM] Taps appointment to expand details again. Scrolls to bottom again.
[10:55 AM] Taps "Cancel Appointment" - takes 3 attempts.
[10:56 AM] Modal appears again. Eleanor very carefully positions finger over "Yes, Cancel" and taps decisively.
[10:56 AM] Modal closes. Appointment now shows "Cancelled" status. Eleanor: "Finally. That was way too hard."

TOTAL TIME TO CANCEL ONE APPOINTMENT: 22 minutes

OBSERVATION SESSION #2  
Date: October 22, 2024
Participant: Marcus, Age 41, ADHD
Setting: Coffee shop, using laptop
Observer: Researcher Janet K.

[2:17 PM] Marcus opens laptop, already has 23 browser tabs open. Opens new tab for HealthConnect.
[2:18 PM] Login screen. Uses password manager to auto-fill credentials. Smooth login.
[2:18 PM] Home screen. Notification banner at top: "You have 3 unread messages" in yellow.
[2:19 PM] Marcus clicks notification. Messages page loads with list of 3 messages.
[2:19 PM] First message: "Your lab results are ready" from Dr. Patterson. Clicks to open.
[2:20 PM] Message opens in new page. Lab results embedded as PDF viewer within page.
[2:20 PM] Phone buzzes. Marcus glances at phone, picks it up, reads text message.
[2:21 PM] Returns attention to laptop. PDF viewer shows spinning loader.
[2:22 PM] Marcus: "What's this still loading?" Clicks refresh button in browser.
[2:22 PM] Returns to home screen. Has to navigate back to Messages, then click same message again.
[2:23 PM] PDF loads. Shows 3-page lab report. Marcus begins reading first page.
[2:24 PM] Coffee shop plays music loudly. Marcus looks up, appears distracted.
[2:25 PM] Returns to reading but has to start over from top of page. "Wait, what was I just reading?"
[2:26 PM] Reads first page. Scrolls to second page using small scrollbar within PDF viewer.
[2:27 PM] Email notification appears in corner of screen. Marcus clicks to check email.
[2:28 PM] Reads email, responds briefly.
[2:30 PM] HealthConnect session has timed out. "Are you still there? Please log in again."
[2:30 PM] Marcus: "Seriously? Ugh." Closes tab without logging back in.
[2:31 PM] Observer asks if he finished reviewing lab results.
[2:31 PM] Marcus: "Oh... no. I'll do it later." Makes note on phone to check results later.

Later interview excerpt:
Marcus: "This happens every time. I log in to do one thing, get sidetracked for a minute, and then I'm logged out and have to start over. It's like the system is designed for someone who can sit down and do everything in one uninterrupted session. That's not how my brain works. I need to be able to step away and come back. By the time I log back in, I've usually forgotten what I was doing anyway."`
      }
    },
    
    fintech: {
      name: "MoneyFlow Business Banking",
      description: "Small business banking platform with invoicing, expense tracking, and multi-user access",
      company: "MoneyFlow Financial Services",
      inputs: {
        interviews: `INTERVIEW #1 - User Carlos, Age 56, Business Owner, Dyslexia
Interviewer: Tell me about the last time you tried to review your transactions.
Carlos: It's a wall of numbers and codes. I own a landscaping business - I need to see who I paid and what for, but everything looks the same. The vendor names are abbreviated, so "Hernandez Supplies" shows as "HERNANDE..." and I have three Hernandez vendors. The amounts all blur together because there's no spacing or grouping. I make mistakes categorizing expenses because I misread similar numbers. Just last week I marked a $1,500 payment as $150 in my records because they looked so similar on screen.

INTERVIEW #2 - User Patricia, Age 44, Accountant, Low Vision
Patricia: I use a screen magnifier at 200% zoom. The transaction table forces me to scroll both horizontally and vertically to see all the columns. I'll be looking at the date in one scroll position, then have to scroll right to see the amount, scroll more to see the category, scroll more to see the memo. I can't see a complete transaction row at once. And the "Edit" button for each transaction? It's tiny. Maybe 20 pixels. I miss it constantly and click the wrong row.

INTERVIEW #3 - User Jennifer, Age 35, Freelancer, Screen Reader User  
Jennifer: The invoice creation workflow is broken for me. I fill out client name, fine. Tab to invoice number, fine. Tab to date field and my screen reader says "interactive element" - no label, no hint about format. I type the date and it rejects it. Apparently it wants MM/DD/YYYY but there's no way for me to know that. Then the line items table... I have no idea what's a header, what's a cell, what row I'm in. I just gave up and use a Word template instead.

INTERVIEW #4 - User David, Age 62, Business Owner, Mild Cognitive Impairment
David: I was trying to set up a recurring payment to my supplier. The form asked me to "define the recurrence pattern" with dropdowns for frequency, interval, day of month, ordinal position... I didn't understand what half of that meant. I just wanted to pay them $500 on the 1st of every month. Why does it need to be so complicated? I ended up calling support and they walked me through it, but I couldn't recreate it on my own the next time.`,

        supportTickets: `TICKET #MF-8721
User: BusinessUser_4472  
Subject: Cannot dispute transaction
Description: There's a charge on my account I don't recognize. The "Dispute" button doesn't work with my screen reader (JAWS). When I activate it, nothing happens. My business account is frozen until this is resolved. This is costing me money.
Status: Open - escalated to dev team

TICKET #MF-8893
User: BusinessUser_2910
Subject: Export cuts off data
Description: Downloaded CSV of all transactions for my accountant. The description field is truncated at 50 characters in the export even though I can see the full description on screen. My accountant needs the complete memo field for tax purposes. Why does the export have less information than the screen view?
Status: Resolved - explained character limit is for compatibility

TICKET #MF-9156  
User: BusinessUser_7234
Subject: Team member access not working
Description: Added my bookkeeper as a team member with "view only" access. She can see everything fine but when she tries to export reports for our tax filing, she gets "insufficient permissions" error. Isn't viewing and exporting the same thing? We're on a deadline.
Status: Resolved - explained export requires "reports" permission not just "view"

TICKET #MF-9472
User: BusinessUser_8801
Subject: Lost work on invoice
Description: Spent 45 minutes creating a detailed invoice with 30 line items. Phone rang, talked for maybe 10 minutes, came back and I was logged out. Invoice draft was not saved. Had to start completely over. This is the third time this has happened. Can you make it save automatically??
Status: Open - feature request logged`,

        survey: `Response ID: S-3421
"The mobile app doesn't remember my Face ID login. I have to type my 16-character password every single time on a phone keyboard. I mostly just don't check my business banking on mobile anymore."

Response ID: S-3509
"When I'm reviewing transactions to categorize them, I can't see enough context. It shows date, amount, vendor - but not what account it came from or the last 4 digits of the card. I have three business cards and I can't tell which transaction happened on which card without drilling into details one by one."

Response ID: S-3847  
"Error messages don't help at all. I tried to transfer money and got 'Transaction failed: Error code BR-449' with no explanation of what that means or how to fix it. Had to call support."

Response ID: S-4102
"The color coding for income vs expenses only uses green and red. I'm colorblind and can't tell them apart. I have to click into each transaction to see if it's money in or money out."`,

        ethnographic: `OBSERVATION SESSION - User Michael, Age 51, Restaurant Owner
Setting: Office computer, end of day reconciliation

[8:45 PM] Opens MoneyFlow on desktop. Multiple interruptions as kitchen staff ask questions.
[8:52 PM] Finally sits down to review today's transactions. 47 transactions listed.
[8:53 PM] Starts scrolling through list. Pauses on transaction: "SQ *FOOD VENDOR" $342.19
[8:54 PM] Michael: "Which food vendor? I have four." Clicks transaction to see details.
[8:55 PM] Details modal opens. Shows same truncated vendor name. No additional context.
[8:56 PM] Opens separate tab with Square dashboard to cross-reference transaction by amount and time.
[8:59 PM] Finds matching transaction in Square. "Okay, that's the produce guy."  
[9:00 PM] Returns to MoneyFlow tab. Detail modal has closed (timeout). Has to find transaction in list again.
[9:02 PM] Opens transaction details again. Attempts to add memo note "produce delivery."
[9:03 PM] Saves note. Modal closes. Continues scrolling to next transaction needing categorization.
[9:04 PM] Process repeats for each unclear transaction. Takes 4-7 minutes per transaction to identify vendor and add context.
[9:47 PM] After 43 minutes, has categorized only 12 of 47 transactions. Phone rings. Takes call.
[9:52 PM] Returns to computer. Session timed out. "You've been logged out for security."
[9:52 PM] Michael: "Are you kidding me?" Logs back in.
[9:54 PM] Returns to transaction list. Previously added notes and categories are saved, but has lost place in list. Has to re-scan to find where he left off.
[9:56 PM] Continues categorization but appears frustrated and rushes through remaining transactions.
[10:15 PM] Gives up on rest. "I'll finish tomorrow." Closes laptop.

Later interview:
Michael: "That timeline tracking is killing me. I'm running a restaurant - people interrupt me constantly. By the time I log back in, I've forgotten what I was doing. And why can't the system just tell me which vendor it is? It knows! It has the full info somewhere!"`
      }
    },
    
    education: {
      name: "EduPortal Learning Management System",
      description: "K-12 learning management system for assignments, grades, and parent communication",
      company: "EduTech Solutions",
      inputs: {
        interviews: `INTERVIEW #1 - Student Alex, Age 14, ADHD, Dyslexia
Alex: The assignment page is so overwhelming. There's like 20 assignments listed and they're all different colors for different subjects, with due dates and points and status icons, and I just... my brain can't process all of it at once. I don't know where to start. I usually just do whatever my mom tells me is due next because I can't figure out the priority myself. And when I'm trying to read the assignment instructions, the text is small and there's stuff in the sidebar that keeps moving and distracting me.

INTERVIEW #2 - Parent Rachel, Spanish-speaking, Limited English
Rachel: [Through translator] I receive emails from my son's teachers in English. I use Google Translate, but the educational words don't translate well. "Formative assessment" "standards-based grading" - even translated, I don't understand what they mean. I want to help my son but I don't know what the teacher is asking for. The parent portal is only in English. I feel lost.

INTERVIEW #3 - Teacher Marcus, Age 38, Creating Accessible Content
Marcus: I have several students with IEPs requiring accessible materials. The platform lets me upload PDFs but doesn't tell me if they're accessible or not. I uploaded a worksheet last month and later found out my student with visual impairment couldn't read it with her screen reader because it was a scanned image. Now I don't trust any PDF I upload. I don't know how to check them myself.

INTERVIEW #4 - Student Jade, Age 16, Anxiety, Executive Function Challenges
Jade: The grade book stresses me out so much. Assignments appear there before they're graded, showing as 0 points, so my grade tanks. Logically I know it's not graded yet, but seeing failing numbers gives me panic attacks. I've stopped checking my grades because it's too stressful, but then I miss when actual graded work is returned.`,

        supportTickets: `TICKET #EP-5521
User: TeacherUser_8291
Subject: Student can't submit assignment
Description: Student reports the "Submit" button doesn't respond when using keyboard navigation. She has a motor disability and cannot use a mouse. Assignment is due tomorrow. How can she submit?
Status: Resolved - advised to submit via email as workaround

TICKET #EP-5643  
User: ParentUser_1047
Subject: Can't find my child's homework
Description: Teacher said homework is posted on EduPortal but I only see upcoming tests in the calendar view. Where is daily homework shown? I need to help my 3rd grader find his assignments each day.
Status: Resolved - explained homework is in Assignments tab, Calendar only shows tests/quizzes

TICKET #EP-5789
User: StudentUser_9203
Subject: Submission confirmation unclear
Description: I uploaded my essay and clicked submit. The page refreshed but I don't see any confirmation that it went through. It just took me back to the assignment list. Did my teacher get it? I'm worried it didn't work.
Status: Resolved - confirmed submission successful, explained status indicator`,

        survey: `Response ID: S-7721
"As a student with processing disorder, I need more time to understand assignment instructions. But the page has a timer showing 'due in 2 hours' that counts down while I'm reading. It makes me panic and I can't focus on the actual work."

Response ID: S-7856
"I'm a parent who's blind and uses a screen reader. The grade book is a visual table with no proper headers. I can't tell which column is which subject or which grade goes with which assignment. I have to ask my sighted daughter to read me my son's grades."

Response ID: S-8102  
"Why does every teacher use the platform differently? One posts homework in Announcements, one uses the Assignments page, one puts everything in Calendar. I have to check three places for five classes. Can't it be standardized?"`,

        ethnographic: `OBSERVATION SESSION - Student Maya, Age 12, Autism, Sensory Sensitivities
Setting: School library computer lab

[2:15 PM] Maya logs into EduPortal. Fluorescent lights buzz overhead - Maya puts on headphones.
[2:16 PM] Home page loads with animated banner ad for upcoming school play. Bright colors, movement.
[2:17 PM] Maya squints, looks away from screen. "Too bright." Reduces screen brightness on monitor.
[2:18 PM] Clicks on "Assignments" in navigation menu to check homework.
[2:18 PM] Page loads. Notification popup appears: "Don't forget about Parent-Teacher conferences!"
[2:19 PM] Maya reads popup slowly. Clicks X to close. Takes deep breath.
[2:19 PM] Scans assignment list. Seven assignments across five subjects, different due dates.
[2:20 PM] Assignment #1: Science - "Research Project Milestone 2" - Due: 2 days
[2:20 PM] Assignment #2: Math - "Chapter 7 Practice Problems" - Due: Tomorrow  
[2:20 PM] Assignment #3: English - "Reading Response Journal" - Due: 3 days
[2:20 PM] Maya stares at screen, not scrolling. Appears overwhelmed.
[2:22 PM] Observer: "How do you decide which to work on first?"
[2:22 PM] Maya: "I don't know. Math is tomorrow so maybe that? But Science is a big project..."
[2:23 PM] Clicks on Math assignment. New page loads.
[2:24 PM] Assignment details: "Complete problems 1-15 on page 284. Show your work. Submit scan or photo of completed work."
[2:25 PM] Below instructions, "Related Resources" section auto-expands showing 8 thumbnail images of various math helps.
[2:25 PM] Maya: "I don't need these." Tries to collapse section - clicks header but section doesn't collapse.
[2:26 PM] Scrolls past resources to get to submission area.
[2:26 PM] Submission area: "Drag file here or click to browse." Maya hasn't done work yet, just checking what's needed.
[2:27 PM] Another student nearby drops textbook loudly. Maya startles, covers ears briefly.
[2:28 PM] Returns focus to screen. Another notification popup: "New announcement from Ms. Johnson"
[2:28 PM] Maya: "Stop interrupting me." Closes popup without reading.
[2:29 PM] Clicks back button to return to assignment list.
[2:30 PM] Page reloads. Math assignment now shows as "Viewed" with green eye icon.
[2:30 PM] Maya: "Wait, that doesn't mean I did it. I just looked at it." Appears concerned.
[2:31 PM] Looks at Science assignment. "Research Project Milestone 2 - Submit Bibliography"
[2:32 PM] Clicks Science assignment.
[2:33 PM] Instructions: "Submit a properly formatted bibliography of at least 5 sources..." Full paragraph of text, no breaks.
[2:34 PM] Maya reads slowly, mouth moving slightly. Pauses several times.
[2:36 PM] Re-reads from beginning. Points at screen with finger to track place.
[2:38 PM] "I don't understand what format it wants." Scrolls down looking for example.
[2:39 PM] No example provided. "Related Resources" section shows 6 links, all labeled "Citation Guide"
[2:40 PM] Maya: "Which one do I use?" Clicks first link.
[2:41 PM] Link opens PDF in new tab. PDF is 15 pages. "MLA Citation Guide - Complete Reference"
[2:42 PM] Maya scrolls through PDF quickly. "This is too much." Closes tab.
[2:43 PM] Clicks second citation guide link. Opens different PDF. "APA Style Basics"
[2:43 PM] Maya: "Is this different from the first one? Which one does Ms. Chen want?"
[2:44 PM] Closes tab without reading. Returns to assignment page.
[2:44 PM] Re-reads assignment instructions. "Properly formatted bibliography" - no mention of MLA vs APA.
[2:45 PM] Maya sits back in chair. "I can't do this right now. Too many things."
[2:46 PM] Closes EduPortal tab. Opens YouTube. "I'll ask Mom to help me tonight."`
      }
    }
  };

  const currentScenario = scenarios[selectedScenario];

  const downloadAsText = () => {
    const content = `UX SYNTHESIS PROMPT - SMOKE TEST DATA
====================================

SCENARIO: ${currentScenario.name}
COMPANY: ${currentScenario.company}
DESCRIPTION: ${currentScenario.description}

====================================
USER INTERVIEW TRANSCRIPTS
====================================

${currentScenario.inputs.interviews}

====================================
SUPPORT TICKETS
====================================

${currentScenario.inputs.supportTickets}

====================================
SURVEY OPEN-ENDED RESPONSES
====================================

${currentScenario.inputs.survey}

====================================
ETHNOGRAPHIC NOTES
====================================

${currentScenario.inputs.ethnographic}

====================================
END OF TEST DATA
====================================

INSTRUCTIONS FOR USE:
1. Copy the data above (from User Interviews through