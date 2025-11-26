# Claude Opus 4.5 vs Gemini 3 Pro Comparison

**Date:** 2025-11-26
**Objective:** Compare Claude Opus 4.5 vs Gemini models capabilities and performance

## Summary

Claude Opus 4.5 and Gemini 3 Pro are both frontier-tier models released in November 2025. Opus 4.5 leads in coding tasks (SWE-bench: 80.9% vs 76.2%), instruction following, and agentic safety. Gemini 3 Pro dominates in multimodal understanding, academic reasoning benchmarks (Humanity's Last Exam: 37.5% vs ~30%), and offers better cost efficiency ($2-4/M input vs $5/M).

## Key Findings

### Coding & Software Engineering
- **Opus 4.5 leads SWE-bench**: 80.9% vs Gemini 3 Pro's 76.2% and GPT-5.1's 76.3%
- **Terminal-Bench**: Opus 4.5 (59.3%) > Gemini 3 Pro (54.2%) > GPT-5.1 (47.6%)
- **User feedback**: Claude better at instruction-following; Gemini/Codex "try to be too smart"
- **Opus 4.5 "effort" parameter**: Low/Medium/High settings for token efficiency

### Reasoning & Academic Benchmarks
- **Gemini 3 Pro leads Humanity's Last Exam**: 37.5% (no tools), 45.8% (with search) vs Opus ~30%
- **ARC-AGI-2**: Gemini 3 Pro 31.1% vs Opus 4.5 ~20% vs GPT-5.1 17.6%
- **GPQA Diamond**: Gemini 3 Pro 91.9% > GPT-5.1 88.1% > Claude ~83-88%
- **AIME 2025 Math**: Gemini 3 Pro 95% ≈ GPT-5.1 94% > Claude 87%

### Multimodal Understanding
- **Gemini 3 Pro dominates**: MMMU-Pro (81%), Video-MMMU, ScreenSpot-Pro (72.7%)
- **Best-in-class**: Document QA, spatial reasoning, 3D understanding, video analysis
- **Opus 4.5 focus**: Text reasoning, not visual creativity

### Safety & Instruction Following
- **Opus 4.5 industry-leading** on prompt injection resistance
- **~10% less concerning behavior** than GPT-5.1 and Gemini 3 Pro
- **Claude "goat of prompt adherence"** per community feedback
- **Less hallucination** than Gemini per user reports

### Pricing (API)
| Model | Context | Input | Output |
|-------|---------|-------|--------|
| Opus 4.5 | 200K | $5/M | $25/M |
| Gemini 3 Pro | 1.05M | $2/M (first 200K) | $12/M |
| Gemini 3 Pro | >200K | $4/M | $18/M |

## Analysis

**Choose Opus 4.5 for:**
- Agentic coding workflows requiring precision
- Complex multi-step tool orchestration
- Tasks where instruction-following is critical
- Security-sensitive applications
- Long-form professional document generation

**Choose Gemini 3 Pro for:**
- Multimodal tasks (images, video, spatial reasoning)
- Academic/scientific research requiring broad reasoning
- Budget-conscious high-volume applications
- Long-context workflows (1M+ tokens)
- Creative UI generation and "vibe coding"

**Note**: "Gemini 3" refers to Gemini 3 Pro released November 2025. There is no "Gemini 3" from the user's original query context—the comparison is against current Gemini 3 Pro, not a hypothetical version.

## Sources

- **[Reddit] r/Bard Discussion**: https://www.reddit.com/r/Bard/comments/1p5q4eq/it_seems_opus_45_is_just_too_amazing_even/
- **[Vellum] Claude Opus 4.5 Benchmarks**: https://www.vellum.ai/blog/claude-opus-4-5-benchmarks
- **[GlobalGPT] Opus 4.5 vs Gemini 3 Comparison**: https://www.glbgpt.com/hub/claude-opus-4-5-vs-gemini-3/
- **[TheNewStack] Opus 4.5 Reclaims Coding Crown**: https://thenewstack.io/anthropics-new-claude-opus-4-5-reclaims-the-coding-crown-from-gemini-3/
- **[Anthropic] Introducing Claude Opus 4.5**: https://www.anthropic.com/news/claude-opus-4-5
- **[DeepMind] Gemini 3 Pro Benchmarks**: https://deepmind.google/models/gemini/pro/
- **[Medium] Opus 4.5 Testing**: https://medium.com/ai-software-engineer/claude-opus-4-5-is-here-and-beats-gemini-3-pro-swe-by-4-7-i-tested-it-e3887df3ed04

---

## Raw Search Results

---

## 1. [It seems opus 4.5 is just too amazing even compared to ...](https://www.reddit.com/r/Bard/comments/1p5q4eq/it_seems_opus_45_is_just_too_amazing_even/)

**URL:** https://www.reddit.com/r/Bard/comments/1p5q4eq/it_seems_opus_45_is_just_too_amazing_even/
**Domain:** www.reddit.com

**Excerpt:**

[Skip to main content]() It seems opus 4.5 is just too amazing even compared to gemini 3 : r/Bard Open menu Open navigation [](/) Go to Reddit Home

r/Bard A chip A close button

[Log In](https://www.reddit.com/login/) Log in to Reddit

Expand user menu Open settings menu

[Go to Bard](/r/Bard/) [r/Bard](/r/Bard/) •

[Independent-Wind4462](/user/Independent-Wind4462/) [Deutsch](https://www.reddit.com/r/Bard/comments/1p5q4eq/it_seems_opus_45_is_just_too_amazing_even/?tl=de)

# It seems opus 4.5 is just too amazing even compared to gemini 3

Share

* * *

[microsoft365](/user/microsoft365/) • Promoted

Microsoft 365 Copilot Chat helps you nail the meeting prep by analyzing, summarizing and drafting reports, so you can shine anywhere, anytime.
Learn More

m365copilot.com

Collapse video player

* * *

[](/user/TechnologyMinute2714/)

[TechnologyMinute2714](/user/TechnologyMinute2714/)

• [](/r/Bard/comments/1p5q4eq/comment/nqkta9p/)

They're both great SOTA models and have their use cases, i feel like Claude is better for agentic coding and Gemini is better for multimodality and it's cheaper. 165

[](/user/Neurogence/)

[Neurogence](/user/Neurogence/)

• [](/r/Bard/comments/1p5q4eq/comment/nqm6q6p/)

I was testing Gemini 3 Pro and Sonnet 4.5 side by side yesterday, and to my shock, Sonnet 4.5 is a lot better on instructions following, creativity, and doesn't hallucinate as much. If even Sonnet can go toe to toe with Gemini 3 Pro, Opus 4.5 is likely way ahead of Gemini 3 in terms of intelligence and capability outside of vision based tasks.
48

[](/user/QuantityGullible4092/)

[QuantityGullible4092](/user/QuantityGullible4092/)

• [](/r/Bard/comments/1p5q4eq/comment/nqmeapb/)

Lots of hallucinations from Gemini

21

3 more replies

3 more replies [Continue this thread](/r/Bard/comments/1p5q4eq/comment/nqmeapb/?force-legacy-sct=1) [](/user/Substantial_Big550/)

[Substantial\_Big550](/user/Substantial_Big550/)

• [](/r/Bard/comments/1p5q4eq/comment/nqnfwz0/)

Codex and Gemini try to be too smart and don't listen to your instructions, but Claude will do what you say no matter what. There are pros and cons to both. When you're working on something and just want the AI to do what you say, Yes, Claude is right. Gemini and Codex work well for refactoring in line with modern standards.
4

1 more reply

1 more reply [Continue this thread](/r/Bard/comments/1p5q4eq/comment/nqnfwz0/?force-legacy-sct=1) 8 more replies

8 more replies [Continue this thread](/r/Bard/comments/1p5q4eq/comment/nqm6q6p/?force-legacy-sct=1) [](/user/Suitable-Opening3690/)

[Suitable-Opening3690](/user/Suitable-Opening3690/)

• [](/r/Bard/comments/1p5q4eq/comment/nqm2nu9/)

The issue on “price” is the max plans now default to opus. So price isn’t an issue. Claude Max users get Opus all the time now they removed the opus limits. So in coding opus is probably king again. Gemini is best day to day. 9

3 more replies

3 more replies [Continue this thread](/r/Bard/comments/1p5q4eq/comment/nqm2nu9/?force-legacy-sct=1) 3 more replies

3 more replies [Continue this thread](/r/Bard/comments/1p5q4eq/comment/nqkta9p/?force-legacy-sct=1) [](/user/randombsname1/)

[randombsname1](/user/randombsname1/)

• [](/r/Bard/comments/1p5q4eq/comment/nqlfbzw/)

This is fantastic.
Claude Code, imo, is still way way ahead of the game in terms of tooling. Skills, workflows, agent customization, hooks, mcp integration, etc...etc...

CC just kind of does all of it better. So, good to see that they are keeping pace. 40 [](/user/NectarineDifferent67/)

[NectarineDifferent67](/user/NectarineDifferent67/)

• [](/r/Bard/comments/1p5q4eq/comment/nqku491/)

Opus 4.5 / 200K / In $5 / Out $25 vs Gemini 3 Pro Preview / 1.05M / In $2 / Out $12

63

[](/user/JoshuaJosephson/)

[JoshuaJosephson](/user/JoshuaJosephson/)

• [](/r/Bard/comments/1p5q4eq/comment/nqm1hlr/)

only the first 200k tokens is 2-12. The rest is 4-18

Still 20% lower than Opus 4.5's 5-25 though which is nice.
 ... 
7

2 more replies

2 more replies [Continue this thread](/r/Bard/comments/1p5q4eq/comment/nqllyw7/?force-legacy-sct=1) 3 more replies

3 more replies [Continue this thread](/r/Bard/comments/1p5q4eq/comment/nql15r1/?force-legacy-sct=1) [](/user/vanishing_grad/)

[vanishing\_grad](/user/vanishing_grad/)

• [](/r/Bard/comments/1p5q4eq/comment/nqlneyz/)

arc-agi is impressive but the other benchmarks are pretty cherrypicked for software dev, which is fair because it's where anthropic is focusing efforts but also not really representative

5 [](/user/neoqueto/)

[neoqueto](/user/neoqueto/)

• [](/r/Bard/comments/1p5q4eq/comment/nqlr9eg/)

Claude has always been the goat of prompt adherence so I hope this is some healthy competition in that particular area that Google won't sleep through preparing the release of 3.5 Pro

5 [](/user/Kako05/)

[Kako05](/user/Kako05/)

• [](/r/Bard/comments/1p5q4eq/comment/nqmkoe8/)

Gemini 3.0 is great for its price and handling of large contexts.

---

## 2. [Claude Opus 4.5 Benchmarks (Explained)](https://www.vellum.ai/blog/claude-opus-4-5-benchmarks)

**URL:** https://www.vellum.ai/blog/claude-opus-4-5-benchmarks
**Domain:** www.vellum.ai

**Excerpt:**

Though very formidable performance, Opus 4.5 still gets beat out by Gemini 3 Pro on Humanity’s Last Exam by ~7% without search and ~2% with search enabled. * **Financial savant:** While Opus 4.5's Vending-Bench 2performance resulted in a balance of $4,967.06, a 23% increase over Sonnet 4.5, but still falling short to Gemini 3 Pro’s net wroth of $5,478.16. * **Safer than the rest:** Concerns around AI safety have been gaining prevalence in the space since bad actors and actors have slowly been penetrating the AI security measures. So on agentic safety evaluations, Anthropic emphasized Opus 4.5’s industry-leading robustness against prompt injection attacks and exhibiting ~10% less concerning behavior than GPT 5.1 and Gemini 3 Pro. ## **Coding capabilities**

Coding benchmarks test a model’s ability to generate, understand, and fix code. They are crucial indicators of a model’s utility in software development workflows, from simple script generation to complex bug resolution.
SWE-bench evaluates real-world GitHub bug fixing, while Terminal-Bench tests command-line proficiency needed for development and operations work. * Claude Opus 4.5 delivers a state-of-the-art 80.9% on SWE-bench, outperforming Gemini 3 Pro (76.2%) and GPT 5.1 (76.3%), which makes it one of the strongest models for real bug resolution. * On Terminal-Bench, Opus 4.5 scores 59.3%, ahead of Gemini 3 Pro (54.2%) and significantly outperforming GPT 5.1 (47.6%), confirming its superior capability in command-line environments. ## Reasoning capabilities

Reasoning benchmarks are designed to evaluate a model's ability to think logically, solve novel problems, and understand complex, abstract concepts. Strong performance here is essential for building agents that can handle multi-step, intricate workflows. The Abstract Reasoning Corpus (ARC-AGI-2) is a test of fluid intelligence, requiring the model to solve novel visual puzzles from just a few examples.
 ... 
lAST UPDATED

Nov 25, 2025

share post

[](#) [](#) [](#) [](#)

Expert verified

Related Posts

[View More](#)

LLM basics

November 20, 2025

•

10 min

Gumloop vs. n8n vs. Vellum (Platform Comparison)

[](/blog/gumloop-vs-n8n-vs-vellum)

Guides

November 18, 2025

•

8 min

Google Gemini 3 Benchmarks

[](/blog/google-gemini-3-benchmarks)

November 11, 2025

•

15 min

AI Agent Use Cases Guide to Unlock AI ROI

[](/blog/ai-agent-use-cases-guide-to-unlock-ai-roi)

LLM basics

November 6, 2025

•

7 min

Beginners Guide to Building AI Agents

[](/blog/beginners-guide-to-building-ai-agents)

Product Updates

November 5, 2025

•

7 min

Vellum Product Update | October

[](/blog/vellum-product-update-october-2025)

All

November 3, 2025

•

6 min

I’m done building AI agents

[](/blog/im-done-building-ai-agents)

The Best AI Tips — Direct To Your Inbox

Latest AI news, tips, and techniques

Specific tips for Your AI use cases

No spam

Thank you! Your submission has been received! Oops!
 ... 
](/blog/claude-opus-4-5-benchmarks)

[Gumloop vs. n8n vs. Vellum (Platform Comparison) A practical 2025 comparison of Gumloop, n8n, and Vellum that breaks down who each platform is for, what they do well, where they fall short to help you find the right fit for your agentic solution. ](/blog/gumloop-vs-n8n-vs-vellum)

[Google Gemini 3 Benchmarks Explore this breakdown of Gemini 3 Pro’s benchmarks and performance across reasoning, math, multimodal, and agentic benchmark to learn what results actually mean for building more powerful AI agents. ](/blog/google-gemini-3-benchmarks)

[AI Agent Use Cases Guide to Unlock AI ROI Explore AI agent use cases by industry with real examples, ROI benchmarks, and a simple plan to begin automating workflows today to unlock AI nativity and ROI](/blog/ai-agent-use-cases-guide-to-unlock-ai-roi)

[Beginners Guide to Building AI Agents A practical beginner guide to buildAI agents.
 ... 
](/blog/how-gravitystack-cut-credit-agreement-review-time-by-200-with-agentic-ai)

[How the Best Product and Engineering Teams Ship AI Solutions Four core practices that enable teams to move 100x faster, without sacrificing reliability. ](/blog/how-the-best-product-and-eng-teams-ship-ai-solutions)

[Evaluation: Claude 4 Sonnet vs OpenAI o4-mini vs Gemini 2.5 Pro Analyzing the difference in performance, cost and speed between the world's best reasoning models. ](/blog/evaluation-claude-4-sonnet-vs-openai-o4-mini-vs-gemini-2-5-pro)

[Document Data Extraction in 2025: LLMs vs OCRs A choice dependent on specific needs, document types and business requirements. ](/blog/document-data-extraction-in-2025-llms-vs-ocrs)

[How to continuously improve your AI Assistant using Vellum Capture edge cases in production and fix them in couple of minutes without redeploying you application.

---

## 3. [Claude Opus 4.5 vs Gemini 3: Which AI Model Is Better in ...](https://www.glbgpt.com/kr/hub/claude-opus-4-5-vs-gemini-3/)

**URL:** https://www.glbgpt.com/kr/hub/claude-opus-4-5-vs-gemini-3/
**Domain:** www.glbgpt.com

**Excerpt:**

**

### **Core improvements in** **Opus** **4\.5**

Claude Opus 4.5 is [Anthropic’s most intelligent flagship model to date,](https://www.glbgpt.com/hub/claude-sonnet-4-5-the-most-powerful-ai-for-30-hours-of-nonstop-coding/) combining extended reasoning, improved coding reliability, and advanced computer-use capabilities. It introduces enhanced zoom-level inspection for UI elements, more stable multi-step reasoning, better tool-use orchestration, and fully preserved thinking blocks across long sessions. Compared to Opus 4.1, it delivers stronger performance in logic-heavy tasks, complex planning, and agent workflows. ### **Strengths and ideal use cases**

Opus 4.5 is designed for deep reasoning, structured analysis, and tasks requiring precision over flair. It performs exceptionally well in multi-step tool workflows, long-form problem-solving, security engineering reviews, and detailed UI inspection through its improved computer-use interface.
 ... 
It builds on the [agent-first foundations of Gemini 2.5 Pro](https://www.glbgpt.com/hub/gpt-5-vs-gemini-2-5-pro-a-detailed-ai-model-review/) but adds dynamic generative interfaces, richer spatial understanding, high-frame-rate video reasoning, and complex web UI generation. It is also deeply integrated into Google Search, Android, and Antigravity-based developer tools. ### **Gemini 3 Deep Think mode**

Deep Think amplifies Gemini 3’s already strong reasoning abilities, improving benchmark scores on ARC-AGI-2, Humanity’s Last Exam, and other abstract reasoning tasks. It enables deeper chain-of-thought planning, interprets nuanced mathematical or scientific concepts, and supports more deliberate multi-step logic. ### **Ideal use cases and model strengths**

Gemini 3 excels at multimodal understanding—images, videos, screen content, spatial layouts, and long-context cross-media reasoning.
 ... 
In official benchmarks, Opus 4.5 shows significant jumps in complex problem-solving and coding reasoning compared to Opus 4.1. Gemini 3, however, achieves frontier-level performance in conceptual reasoning through its Deep Think mode and consistently leads on academic-style benchmarks like Humanity’s Last Exam, ARC-AGI-2, and GPQA. It also displays stronger intuition with abstract patterns and high-level conceptual interpretation, especially in science and mathematics. ## **How do Claude** **Opus** **4\.5 and Gemini 3 compare in multimodal understanding? **

Gemini 3 sets a new bar for multimodal intelligence with best-in-class performance on MMMU-Pro, Video-MMMU, document QA, and spatial reasoning. It handles complex visual instructions, 3D understanding, time-dependent video analysis, and UI comprehension in a way that is far more fluid than previous versions.
 ... 
Opus 4.5 inherits much of this improved coding stability, especially in long-context architectures, security reasoning, and systematic refactoring. Gemini 3, especially in Google Antigravity, excels at **agentic coding** , enabling multiple agents to operate simultaneously across editors, terminals, and browser contexts. It also leads the WebDev Arena leaderboard with 1487 Elo and performs exceptionally well in Terminal-Bench 2.0, making it strong for full-stack interactive development. ## **Which model is better for creative tasks, planning, and** **UI** **generation? **

Gemini 3 is the stronger model for [vivid creative ideation,](https://www.glbgpt.com/hub/chatgpt-vs-gemini-3-pro-for-blog-writing/) 3D visualization, UI layout coding, and interactive content generation. Its “vibe coding” paradigm allows a single prompt to generate fully functional web apps, interactive tutorials, or immersive 3D experiences.
Claude Opus 4.5 produces polished writing, high-consistency story structures, and detailed professional documents. It is less focused on visual creativity but excels at producing coherent, logically consistent content over very long documents. ## **Pricing Comparison: Claude Opus 4.5 vs Gemini 3**

### Key Takeaways

**Claude Opus 4.5** has the highest per-token cost, reflecting its focus on deep reasoning and long-context planning. **Gemini 3 Pro** offers significantly lower pricing with strong multimodal and UI-generation capabilities. **GlobalGPT** removes per-token billing entirely—its ~$5.75 Basic plan gives access to 100+ models, offering the best value for users who switch between multiple AI systems. ### **Which model is more cost-efficient? **

Gemini 3 is generally more cost-effective for multimodal, creative, or video-rich tasks, while Claude Opus 4.5 becomes more efficient for deep reasoning tasks where output size is smaller relative to the complexity of the reasoning.

---

## 4. [Gemini 2.5: Our most intelligent AI model - Google Blog](https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/)

**URL:** https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/
**Domain:** blog.google

**Excerpt:**

[Google DeepMind](https://blog.google/technology/google-deepmind/)

# Gemini 2.5: Our most intelligent AI model

Mar 25, 2025

·

Share

[Twitter](https://twitter.com/intent/tweet?text=Gemini%202.5%3A%20Our%20most%20intelligent%20AI%20model%20%40google&url=https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/) [Facebook](https://www.facebook.com/sharer/sharer.php?caption=Gemini%202.5%3A%20Our%20most%20intelligent%20AI%20model&u=https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/) [LinkedIn](https://www.linkedin.com/shareArticle?mini=true&url=https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/&title=Gemini%202.5%3A%20Our%20most%20intelligent%20AI%20model) [Mail](mailto:?subject=Gemini%202.5%3A%20Our%20most%20intelligent%20AI%20model&body=Check out this article on the Keyword:%0A%0AGemini%202.5%3A%20Our%20most%20intelligent%20AI%20model%0A%0AGemini 2.5 is our most intelligent AI
model, now with thinking.%0A%0Ahttps://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/)

Copy link

Gemini 2.5 is a thinking model, designed to tackle increasingly complex problems. Our first 2.5 model, Gemini 2.5 Pro Experimental, leads common benchmarks by meaningful margins and showcases strong reasoning and code capabilities.
 ... 
thinking.%0A%0Ahttps://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/)

Copy link

In this story

In this story

* * *

* [Introducing Gemini 2.5]()
* [Gemini 2.5 Pro]()
* [Enhanced reasoning]()
* [Advanced coding]()
* [The best of Gemini]()

_Last updated March 26_

Today we’re introducing Gemini 2.5, our most intelligent AI model. Our first 2.5 release is an experimental version of 2.5 Pro, which is state-of-the-art on a wide range of benchmarks and debuts at #1 on [LMArena](https://lmarena.ai/?leaderboard) by a significant margin. [Gemini 2.5 models](https://deepmind.google/technologies/gemini) are thinking models, capable of reasoning through their thoughts before responding, resulting in enhanced performance and improved accuracy. In the field of AI, a system’s capacity for “reasoning” refers to more than just classification and prediction.
 ... 
It tops the [LMArena](https://lmarena.ai/?leaderboard) leaderboard — which measures human preferences — by a significant margin, indicating a highly capable model equipped with high-quality style. 2.5 Pro also shows strong reasoning and code capabilities, leading on common coding, math and science benchmarks. Gemini 2.5 Pro is available now in [Google AI Studio](http://aistudio.google.com/app/prompts/new_chat?model=gemini-2.5-pro-exp-03-25) and in the [Gemini app](https://gemini.google.com/) for Gemini Advanced users, and will be coming to [Vertex AI](https://console.cloud.google.com/freetrial?redirectPath=/vertex-ai/studio) soon. We’ll also introduce pricing in the coming weeks, enabling people to use 2.5 Pro with higher rate limits for scaled production use. Updated March 26 with new MRCR (Multi Round Coreference Resolution) evaluations

## Enhanced reasoning

Gemini 2.5 Pro is state-of-the-art across a range of benchmarks requiring advanced reasoning.
Without test-time techniques that increase cost, like majority voting, 2.5 Pro leads in math and science benchmarks like GPQA and AIME 2025. It also scores a state-of-the-art 18.8% across models without tool use on Humanity’s Last Exam, a dataset designed by hundreds of subject matter experts to capture the human frontier of knowledge and reasoning. ## Advanced coding

We’ve been focused on coding performance, and with Gemini 2.5 we’ve achieved a big leap over 2.0 — with more improvements to come. 2.5 Pro excels at creating visually compelling web apps and agentic code applications, along with code transformation and editing. On SWE-Bench Verified, the industry standard for agentic code evals, Gemini 2.5 Pro scores 63.8% with a custom agent setup. Here’s an example of how 2.5 Pro can use its reasoning capabilities to create a video game by producing the executable code from a single line prompt.

---

## 5. [Anthropic's New Claude Opus 4.5 Reclaims the Coding ...](https://thenewstack.io/anthropics-new-claude-opus-4-5-reclaims-the-coding-crown-from-gemini-3/)

**URL:** https://thenewstack.io/anthropics-new-claude-opus-4-5-reclaims-the-coding-crown-from-gemini-3/
**Domain:** thenewstack.io

**Excerpt:**

Dunlop](/adam-jacob-on-why-scaling-is-the-funnest-game/)

[Data Locality vs. Independence: Which Should Your Database Prioritize?
 ... 
Python](/build-your-first-http-server-in-python/)

Nov 4th 2025 3:00pm, by Jessica Wachtel

[The Rise of JavaScript in Machine Learning](/the-rise-of-javascript-in-machine-learning/)

Oct 23rd 2025 9:03am, by Loraine Lawson

[SQL vs. Python: Frenemies of the Data World](/sql-vs-python-frenemies-of-the-data-world/)

Oct 14th 2025 7:00am, by Ivan Novick

[Debian Mandates Rust for APT, Reshaping Ubuntu and Other Linux Distros](/debian-mandates-rust-for-apt-reshaping-ubuntu-and-other-linux-distros/)

Nov 11th 2025 12:00pm, by Steven J. Vaughan-Nichols

[Moving From C++ to Rust?
 ... 
Cassel

[Go Power: Microsoft's Bold Bet on Faster TypeScript Tools](/go-power-microsofts-bold-bet-on-faster-typescript-tools/)

Mar 12th 2025 1:00pm, by Darryl K. Taft and Loraine Lawson

[Oracle Won’t Release ‘JavaScript’ Without a Fight](/oracle-wont-release-javascript-without-a-fight/)

Jan 11th 2025 5:00am, by Loraine Lawson

[The Year in JavaScript: Top JS News Stories of 2024](/the-year-in-javascript-top-js-news-stories-of-2024/)

Dec 27th 2024 6:30am, by Loraine Lawson

2025-11-24 11:00:23

Anthropic's New Claude Opus 4.5 Reclaims the Coding Crown

[AI](/category/ai/) / [AI Agents](/category/ai-agents/)

# Anthropic’s New Claude Opus 4.5 Reclaims the Coding Crown

In addition to the new model, Anthropic is also announcing two updates to the Claude Developer Platform that go hand-in-hand with the Opus 4.5 release. Nov 24th, 2025 11:00am by [Frederic Lardinois](https://thenewstack.io/author/frederic-lardinois/ "Posts by Frederic Lardinois")

Featured image credit: Anthropic.
Anthropic today launched the latest version of its flagship Opus model: Opus 4.5. The company calls it its most intelligent model yet and notes that it is especially strong in solving coding tasks, taking the crown from OpenAI’s [GPT-5.1-Codex-Max](https://thenewstack.io/openai-says-its-new-codex-max-model-is-better-faster-and-cheaper/) and Google’s week-old [Gemini 3](https://thenewstack.io/google-launches-gemini-3-pro/) model with an SWE-Bench Verified accuracy score of 80.9%. The company is also making Opus 4.5 significantly more affordable to use, with API pricing of $5 per million input tokens and $25 per million output tokens, down from $15/$75 per million input/output tokens. Users on Anthropic’s subscription plans will also now see a bit more headroom to use Opus 4.5.
## Benchmarks

With the launches of OpenAI’s GPT-5.1 and 5.1-Codex-Max, Google’s [Gemini 3](https://thenewstack.io/google-launches-gemini-3-pro/) (and its hit Nano Banana Pro image model), it’s been a very active November for the large model builders. Gemini 3, especially, received a very positive reception. Unlike Google, Anthropic has never focused on image manipulation or video creation, but has stuck squarely to its strength in coding and productivity use cases. This latest Opus is no different and Anthropic stresses that the model can now produce documents, spreadsheets and presentations “with consistency, professional polish, and domain awareness.”

But as usual, it’s coding where the Claude models shine. That’s reflected on the benchmarks, where Opus 4.5 bests the competition across the board, but benchmarks don’t always reflect real-world use cases, of course. Credit: Anthropic.
 ... 
I still am reviewing it and things, but I really could have just been hands-off here.”

## Low, Medium, High Effort

One new feature of Opus 4.5 is that it features an “effort” parameter (low, medium, high), similar to some of its competitors’ models, which allows developers to control how much time (and how many tokens) the model will use to solve a given problem. Set to medium, the model is on par with Sonnet 4.5 on the SWE-bench Verified benchmark but uses 76% fewer tokens, and even at the high setting, where it beats Sonnet 4.5, it uses only about half the tokens of the Sonnet model. That’s a trend we’ve been seeing and this efficiency is something OpenAI also stressed when it launched its latest [Codex-Max](https://thenewstack.io/openai-says-its-new-codex-max-model-is-better-faster-and-cheaper/) model last week. Overall, the model also improved upon the rest of the Opus family (and Opus 4.1) in other areas, including visual reasoning and math. Credit: Anthropic.

---

## 6. [Claude Opus 4.5 Is Here (And Beats Gemini 3 Pro SWE by ...](https://medium.com/ai-software-engineer/claude-opus-4-5-is-here-and-beats-gemini-3-pro-swe-by-4-7-i-tested-it-e3887df3ed04)

**URL:** https://medium.com/ai-software-engineer/claude-opus-4-5-is-here-and-beats-gemini-3-pro-swe-by-4-7-i-tested-it-e3887df3ed04
**Domain:** medium.com

**Excerpt:**

-e3887df3ed04&source=---header_actions--e3887df3ed04---------------------post_audio_button------------------)

Share

Press enter or click to view image in full size

Anthropic just released the Claude Opus 4.5 model, and the timing is perfect, _just days after the Gemini 3 Pro release._

> **We’re in the middle of what feels like an AI arms race. Every week brings a new model, a new capability, a new benchmark shattered. **
> 
> 

Anthropic claims this is the best coding model in the world. They say it scored higher on their internal engineering exam than any human candidate ever has. > They’re talking about a model that “just gets it” without hand-holding. Those are bold claims in a market crowded with frontier models. > 
> 

> **So I took it for a quick test to see if it lives up to this claim, and as you are going to see in the last testing section, it surprised me.

---

## 7. [I tested Opus 4.5 vs. Gemini 3 vs. ChatGPT 5.1 on real- ...](https://natesnewsletter.substack.com/p/claude-opus-45-loves-messy-real-world)

**URL:** https://natesnewsletter.substack.com/p/claude-opus-45-loves-messy-real-world
**Domain:** natesnewsletter.substack.com

**Excerpt:**

[](/)

# [](/)

Subscribe Sign in

Playback speed

×

Share post

Share post at current time

Share from 0:00

0:00

/

0:00

Playback speed

×

Share post

0:00

/

0:00

Preview

7

1

## I Tested Opus 4.5 Early—Here's Where It Can Save You HOURS on Complex Workflows + a Comparison vs. Gemini 3 and ChatGPT 5.1 + a Model-Picker Prompt + 15 Workflows to Get Started Now

I tested Opus 4.5 vs. Gemini 3 vs. ChatGPT 5.1 on real-world business tasks: here's what I found, plus a complete breakdown of which model I'd use for complex workflows plus a custom model-picker! [](https://substack.com/@natesnewsletter)

[Nate](https://substack.com/@natesnewsletter)

Nov 25, 2025

∙ Paid

7

1

Share

I’ll cut to it: Opus 4.5 IS a big deal. Even during a week that has felt like one endless model release after another. But I’m not here to tell you this is a big deal because of benchmarks.

---

## 8. [Introducing Claude Opus 4.5](https://www.anthropic.com/news/claude-opus-4-5)

**URL:** https://www.anthropic.com/news/claude-opus-4-5
**Domain:** www.anthropic.com

**Excerpt:**

We’re updating usage limits to make sure you’re able to use Opus 4.5 for daily work. These limits are specific to Opus 4.5. As future models surpass it, we expect to update limits as needed. #### Footnotes

_1: This result was using parallel test-time compute, a method that aggregates multiple “tries” from the model and selects from among them. Without a time limit, the model (used within Claude Code) matched the best-ever human candidate._

_2: We improved the hosting environment to reduce infrastructure failures. This change improved Gemini 3 to 56.7% and GPT-5.1 to 48.6% from the values reported by their developers, using the Terminus-2 harness._

_3: Note that these evaluations were run on an in-progress upgrade to [Petri](https://www.anthropic.com/research/petri-open-source-auditing) , our open-source, automated evaluation tool. They were run on an earlier snapshot of Claude Opus 4.5.

---

## 9. [Claude Opus 4.5 vs Gemini 3: Which AI Model Is Better in ...](https://www.glbgpt.com/hub/claude-opus-4-5-vs-gemini-3/)

**URL:** https://www.glbgpt.com/hub/claude-opus-4-5-vs-gemini-3/
**Domain:** www.glbgpt.com

**Excerpt:**

**

Claude Opus 4.5 pushes Anthropic’s reasoning capabilities forward with extended thinking, more stable chain-of-thought execution, and highly reliable tool use. It excels in tasks requiring multi-step logic, structured decomposition, and precise decision-making across long agent workflows. In official benchmarks, Opus 4.5 shows significant jumps in complex problem-solving and coding reasoning compared to Opus 4.1. Gemini 3, however, achieves frontier-level performance in conceptual reasoning through its Deep Think mode and consistently leads on academic-style benchmarks like Humanity’s Last Exam, ARC-AGI-2, and GPQA. It also displays stronger intuition with abstract patterns and high-level conceptual interpretation, especially in science and mathematics. ## **How do Claude** **Opus** **4\.5 and Gemini 3 compare in multimodal understanding?

---

## 10. [Google Gemini 3 Is the Best Model Ever. One Score Stands Out ...](https://www.thealgorithmicbridge.com/p/google-gemini-3-just-killed-every)

**URL:** https://www.thealgorithmicbridge.com/p/google-gemini-3-just-killed-every
**Domain:** www.thealgorithmicbridge.com

**Excerpt:**

Gemini 3 is great, much better than the alternatives—including [GPT-5.1](https://openai.com/index/gpt-5-1/) (recently released by OpenAI) and [Claude Sonnet 4.5](https://www.anthropic.com/news/claude-sonnet-4-5) (from Anthropic)—but I wouldn’t update much on benchmark scores (they’re mostly noise!). However, there’s one achievement that stands out to me as not only impressive but _genuinely surprising_ . But before I go into that, let’s do a quick review of just how good Gemini 3 is compared to the competition. Google [says](https://x.com/GoogleDeepMind/status/1990812966074376261) Gemini 3 has “state-of-the-art reasoning capabilities, world-leading multimodal understanding, and enables new agentic coding experiences,” but when every new model from a frontier AI company is accompanied by the same kind of description, I believe the differences are better understood with images (and, of course, firsthand experience with the models).

---

## 11. [Claude Opus 4.5 Thinking 16K scores 63.8 on the ...](https://www.reddit.com/r/singularity/comments/1p683x1/claude_opus_45_thinking_16k_scores_638_on_the/)

**URL:** https://www.reddit.com/r/singularity/comments/1p683x1/claude_opus_45_thinking_16k_scores_638_on_the/
**Domain:** www.reddit.com

**Excerpt:**

[Skip to main content]() Open menu Open navigation [](/) Go to Reddit Home

r/singularity A chip A close button

[Log In](https://www.reddit.com/login/) Log in to Reddit

Expand user menu Open settings menu

[Go to singularity](/r/singularity/) [r/singularity](/r/singularity/) •

[zero0\_one1](/user/zero0_one1/)

# Claude Opus 4.5 Thinking 16K scores 63.8 on the Extended NYT Connections benchmark (Opus 4.1 Thinking 16K: 58.8, Sonnet 4.5 Thinking: 48.2). * 
*

<https://github.com/lechmazur/nyt-connections/>

By far the best non-reasoning model, but reasoning adds little.

---

## 12. [Gemini models | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/models)

**URL:** https://ai.google.dev/gemini-api/docs/models
**Domain:** ai.google.dev

**Excerpt:**

patterns](/gemini-api/docs/models/gemini) for more details. * `Preview: gemini-3-pro-image-preview` |
|calendar\_month Latest update |November 2025 |
|cognition\_2 Knowledge cutoff |January 2025 |

OUR ADVANCED THINKING MODEL

## Gemini 2.5 Pro

Our state-of-the-art thinking model, capable of reasoning over complex problems in code, math, and STEM, as well as analyzing large datasets, codebases, and documents using long context.
 ... 
details. * `gemini-2.5-pro-preview-tts` |
|calendar\_month Latest update |May 2025 |

FAST AND INTELLIGENT

## Gemini 2.5 Flash

Our best model in terms of price-performance, offering well-rounded capabilities. 2.5 Flash is best for large scale processing, low-latency, high volume tasks that require thinking, and agentic use cases.

---

## 13. [Claude Opus 4.5 vs Gemini 3.0 Pro vs GPT-5.1](https://blog.getbind.co/2025/11/26/claude-opus-4-5-vs-gemini-3-0-pro-vs-gpt-5-1-which-is-best-for-coding/)

**URL:** https://blog.getbind.co/2025/11/26/claude-opus-4-5-vs-gemini-3-0-pro-vs-gpt-5-1-which-is-best-for-coding/
**Domain:** blog.getbind.co

**Excerpt:**

12 hours ago — Claude Opus 4.5 writes better code, leading across 7 out of 8 ... While Anthropic's Opus 4.5 outperforms it in raw coding benchmarks ...

---

## 14. [Claude Opus 4.5 vs. ChatGPT 5.1 - Data Studios](https://www.datastudios.org/post/claude-opus-4-5-vs-chatgpt-5-1-full-report-and-comparison-of-models-features-performance-pricin)

**URL:** https://www.datastudios.org/post/claude-opus-4-5-vs-chatgpt-5-1-full-report-and-comparison-of-models-features-performance-pricin
**Domain:** www.datastudios.org

**Excerpt:**

Both models perform exceptionally well here, each hovering around roughly **90% accuracy** . Essentially, they both demonstrate mastery across disciplines, turning in performances that would correspond to top-percentile human test-takers. Neither has a decisive edge – they’re effectively tied on MMLU, indicating that in broad knowledge and reasoning, they are equally strong. * **Advanced Reasoning Tests:** On newer, extremely difficult evaluations (for instance, _“Humanity’s Last Exam”_ or ARC-Advanced challenges, which are designed to stump AI with counterintuitive logic or require creative problem solving), **the results vary by task** . Generally, **Google’s Gemini 3 Pro leads on many of these** , with ChatGPT 5.1 often coming second and Claude 4.5 close behind. For example, on a PhD-level scientific QA benchmark ( _GPQA Diamond_ ), Gemini might score in the low 90s, ChatGPT just a hair behind that, and Claude in the high 80s.

---

## 15. [Gemini 3 Pro - Google DeepMind](https://deepmind.google/models/gemini/pro/)

**URL:** https://deepmind.google/models/gemini/pro/
**Domain:** deepmind.google

**Excerpt:**

Slide 1 of 3

chevron\_left chevron\_right

|Benchmark |Notes |Gemini 3 Pro |Gemini 2.5 Pro |Claude Sonnet 4.5 |GPT-5.1 |
| --- | --- | --- | --- | --- | --- |
|Academic reasoning Humanity's Last Exam |No tools |37\.5% |21\.6% |13\.7% |26\.5% |
|With search and code execution |45\.8% |— |— |— |
|Visual reasoning puzzles ARC-AGI-2 |ARC Prize Verified |31\.1% |4\.9% |13\.6% |17\.6% |
|Scientific knowledge GPQA Diamond |No tools |91\.9% |86\.4% |83\.4% |88\.1% |
|Mathematics AIME 2025 |No tools |95\.0% |88\.0% |87\.0% |94\.0% |
|With code execution |100\.0% |— |100\.0% |— |
|Challenging Math Contest problems MathArena Apex | |23\.4% |0\.5% |1\.6% |1\.0% |
|Multimodal understanding and reasoning MMMU-Pro | |81\.0% |68\.0% |68\.0% |76\.0% |
|Screen understanding ScreenSpot-Pro | |72\.7% |11\.4% |36\.2% |3\.5% |
|Information synthesis from complex charts CharXiv Reasoning | |81\.4% |69\.6% |68\.5% |69\.5% |
|OCR OmniDocBench 1.5 |Overall Edit Distance, lower is better |0\.115 |0\.145

---
