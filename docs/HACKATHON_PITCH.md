# Pedi-Growth: 3-Minute Hackathon Pitch

*Pacing: ~420 words | Time: ~3 Minutes*

---

## 1. The Hook (0:00 - 0:30)
**[Imagine this scene]**
A nervous parent watches their toddler walk across the living room. Something seems slightly off—maybe a slight limp, maybe a wide stance. They search online, panic, and wait three months for a 15-minute pediatric appointment. Meanwhile, the pediatrician on the other side is flying blind. They rely entirely on what a scared parent remembers to tell them, and whatever the child happens to do during that brief 15-minute window in a sterile, unfamiliar clinic. 

This disconnect is why critical neuromuscular conditions like Cerebral Palsy and Duchenne Muscular Dystrophy (DMD) are often diagnosed too late. 

## 2. The Problem (0:30 - 1:00)
Currently, gold-standard gait and motor analysis requires expensive, million-dollar laboratory setups with wearable sensors and force plates. It is fundamentally inaccessible. 
But what if the supercomputer already in every parent's pocket could bridge this gap?

## 3. The Solution & Centralized Vision (1:00 - 1:45)
Enter **Pedi-Growth**. 

We have built a centralized, computer-vision ecosystem that acts as the ultimate communication bridge between the living room and the clinician's office. Unlike traditional, fragmented healthcare portals, Pedi-Growth is a unified system where patient and clinic finally speak the same language, empowered by accessible, world-class technology.

Through our platform, a parent simply uses a standard smartphone browser to record a 5-second video of their child walking. No apps to install. No wearables. 100% accessible. 

## 4. How the Tech Works (1:45 - 2:20)
Under the hood, we are doing heavy lifting. 
As soon as the video is captured, our client-side WebAssembly models process the video directly in the browser—meaning maximum privacy. We extract skeletal pose landmarks and send them to our Python backend, where complex heuristics compute metrics like stride regularity, frontal asymmetry, and trunk sway. 

The magic happens when this data hits our Supabase cloud infrastructure. We automatically normalize this massive data payload into a unified JSON document.

## 5. The Dual-Portal Experience (2:20 - 2:45)
Because of our centralized cloud architecture, we synthesize that single data source into two tailored experiences:
1. **The Parent Portal:** We strip away the medical jargon. We give the parent clear, localized, and actionable insight—rating follow-up priorities gracefully so the parent is empowered, not panicked.
2. **The Clinician Portal:** Instantly, the doctor has access to an exhaustive dashboard. They see time-series graphs mapping shoulder tilt versus pelvic tilt. They see automated flags for GMFCS severity and DMD risk.

## 6. The Close (2:45 - 3:00)
With Pedi-Growth, the clinician is no longer reliant on a 15-minute snapshot, and the parent is no longer alone in the dark. 

By turning any smartphone into a clinical-grade gait laboratory, we are democratizing early pediatric screening, ensuring every child gets the right intervention, at the exact right time. 

Thank you.
