# Parallel Search Results

**Query:** Minimal task spec format for AI agent execution
**Results:** 15
**Execution:** 2.6s

**Top Domains:**
- medium.com: 2 results (13%)
- www.anthropic.com: 2 results (13%)
- cloud.google.com: 1 results (7%)
- www.uipath.com: 1 results (7%)
- learn.microsoft.com: 1 results (7%)

---

## 1. [The Art of Writing Specs for Agent-Based AI Systems | by Kittikawin L.](https://medium.com/@kittikawin_ball/the-art-of-writing-specs-for-agent-based-ai-systems-03deed21b4e1)

**URL:** https://medium.com/@kittikawin_ball/the-art-of-writing-specs-for-agent-based-ai-systems-03deed21b4e1
**Domain:** medium.com

**Excerpt:**

In this article, I'll walk you through the art of writing specs for agent-based AI systems — why they matter, how to structure them, common ...

---

## 2. [Building Effective AI Agents - Anthropic](https://www.anthropic.com/research/building-effective-agents)

**URL:** https://www.anthropic.com/research/building-effective-agents
**Domain:** www.anthropic.com

**Excerpt:**

## When and how to use frameworks

There are many frameworks that make agentic systems easier to implement, including:

* The [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview) ;
* Amazon Bedrock's [AI Agent framework](https://aws.amazon.com/bedrock/agents/) ;
* [Rivet](https://rivet.ironcladapp.com/) , a drag and drop GUI LLM workflow builder; and
* [Vellum](https://www.vellum.ai/) , another GUI tool for building and testing complex workflows. These frameworks make it easy to get started by simplifying standard low-level tasks like calling LLMs, defining and parsing tools, and chaining calls together. However, they often create extra layers of abstraction that can obscure the underlying prompts ​​and responses, making them harder to debug. They can also make it tempting to add complexity when a simpler setup would suffice. We suggest that developers start by using LLM APIs directly: many patterns can be implemented in a few lines of code.
 ... 
The prompt chaining workflow

**When to use this workflow:** This workflow is ideal for situations where the task can be easily and cleanly decomposed into fixed subtasks. The main goal is to trade off latency for higher accuracy, by making each LLM call an easier task. **Examples where prompt chaining is useful:**

* Generating Marketing copy, then translating it into a different language. * Writing an outline of a document, checking that the outline meets certain criteria, then writing the document based on the outline. ### Workflow: Routing

Routing classifies an input and directs it to a specialized followup task. This workflow allows for separation of concerns, and building more specialized prompts. Without this workflow, optimizing for one kind of input can hurt performance on other inputs.
 ... 
During execution, it's crucial for the agents to gain “ground truth” from the environment at each step (such as tool call results or code execution) to assess its progress. Agents can then pause for human feedback at checkpoints or when encountering blockers. The task often terminates upon completion, but it’s also common to include stopping conditions (such as a maximum number of iterations) to maintain control. Agents can handle sophisticated tasks, but their implementation is often straightforward. They are typically just LLMs using tools based on environmental feedback in a loop. It is therefore crucial to design toolsets and their documentation clearly and thoughtfully. We expand on best practices for tool development in Appendix 2 ("Prompt Engineering your Tools"). Autonomous agent

**When to use agents:** Agents can be used for open-ended problems where it’s difficult or impossible to predict the required number of steps, and where you can’t hardcode a fixed path.
 ... 
Frameworks can help you get started quickly, but don't hesitate to reduce abstraction layers and build with basic components as you move to production. By following these principles, you can create agents that are not only powerful but also reliable, maintainable, and trusted by their users. ### Acknowledgements

Written by Erik Schluntz and Barry Zhang. This work draws upon our experiences building agents at Anthropic and the valuable insights shared by our customers, for which we're deeply grateful. ## Appendix 1: Agents in practice

Our work with customers has revealed two particularly promising applications for AI agents that demonstrate the practical value of the patterns discussed above. Both applications illustrate how agents add the most value for tasks that require both conversation and action, have clear success criteria, enable feedback loops, and integrate meaningful human oversight. ### A.
 ... 
Our suggestions for deciding on tool formats are the following:

* Give the model enough tokens to "think" before it writes itself into a corner. * Keep the format close to what the model has seen naturally occurring in text on the internet. * Make sure there's no formatting "overhead" such as having to keep an accurate count of thousands of lines of code, or string-escaping any code it writes. One rule of thumb is to think about how much effort goes into human-computer interfaces (HCI), and plan to invest just as much effort in creating good _agent_ \-computer interfaces (ACI). Here are some thoughts on how to do so:

* Put yourself in the model's shoes. Is it obvious how to use this tool, based on the description and parameters, or would you need to think carefully about it? If so, then it’s probably also true for the model. A good tool definition often includes example usage, edge cases, input format requirements, and clear boundaries from other tools.

---

## 3. [What are AI agents? Definition, examples, and types](https://cloud.google.com/discover/what-are-ai-agents)

**URL:** https://cloud.google.com/discover/what-are-ai-agents
**Domain:** cloud.google.com

**Excerpt:**

Page Contents

* [Topics](https://cloud.google.com/discover/)
* 
* AI agents

# What is an AI agent? AI agents are software systems that use AI to pursue goals and complete tasks on behalf of users. They show reasoning, planning, and memory and have a level of autonomy to make decisions, learn, and adapt. Their capabilities are made possible in large part by the multimodal capacity of generative AI and AI foundation models. AI agents can process multimodal information like text, voice, video, audio, code, and more simultaneously; can converse, reason, learn, and make decisions. They can learn over time and facilitate transactions and business processes. Agents can work with other agents to coordinate and perform more complex workflows.
 ... 
| |**AI agent** |**AI assistant** |**Bot** ﻿ |
| --- | --- | --- | --- |
|**Purpose** |Autonomously and proactively perform tasks |Assisting users with tasks |Automating simple tasks or conversations |
|**Capabilities** |Can perform complex, multi-step actions; learns and adapts; can make decisions independently |Responds to requests or prompts; provides information and completes simple tasks; can recommend actions but the user makes decisions |Follows pre-defined rules; limited learning; basic interactions |
|**Interaction** |Proactive; goal-oriented |Reactive; responds to user requests |Reactive; responds to triggers or commands |

**AI agent**

**AI assistant**

**Bot** ﻿

**Purpose**

Autonomously and proactively perform tasks

Assisting users with tasks

Automating simple tasks or conversations

**Capabilities**

Can perform complex, multi-step actions; learns and adapts; can make decisions independently

Responds to requests or prompts; provides information and completes simple
tasks; can recommend actions but the user makes decisions

Follows pre-defined rules; limited learning; basic interactions

**Interaction**

Proactive; goal-oriented

Reactive; responds to user requests

Reactive; responds to triggers or commands

### Key differences

* **Autonomy** : AI agents have the highest degree of autonomy, able to operate and make decisions independently to achieve a goal. AI assistants are less autonomous, requiring user input and direction. Bots are the least autonomous, typically following pre-programmed rules. * **Complexity** : AI agents are designed to handle complex tasks and workflows, while AI assistants and bots are better suited for simpler tasks and interactions. * **Learning** : AI agents often employ machine learning to adapt and improve their performance over time. AI assistants may have some learning capabilities, while bots typically have limited or no learning. ## How do AI agents work?
 ... 
### Based on interaction

One way to categorize agents is by how they interact with users. Some agents engage in direct conversation, while others operate in the background, performing tasks without direct user input:

* **Interactive partners** (also known as, surface agents) – Assisting us with tasks like customer service, healthcare, education, and scientific discovery, providing personalized and intelligent support. Conversational agents include Q&A, chit chat, and world knowledge interactions with humans. They are generally user query triggered and fulfill user queries or transactions. * **Autonomous background processes** (also known as, background agents) – Working behind the scenes to automate routine tasks, analyze data for insights, optimize processes for efficiency, and proactively identify and address potential issues. They include workflow agents. They have limited or no human interaction and are generally driven by events and fulfill queued tasks or chains of tasks.
### Based on number of agents

* **Single agent** : Operate independently to achieve a specific goal. They utilize external tools and resources to accomplish tasks, enhancing their functional capabilities in diverse environments. They are best suited for well defined tasks that do not require collaboration with other AI agents. Can only handle one foundation model for its processing. * **Multi-agent** : Multiple AI agents that collaborate or compete to achieve a common objective or individual goals. These systems leverage the diverse capabilities and roles of individual agents to tackle complex tasks. Multi-agent systems can simulate human behaviors, such as interpersonal communication, in interactive scenarios. Each agent can have different foundation models that best fit their needs.

---

## 4. [10 best practices for building reliable AI agents in 2025 - UiPath](https://www.uipath.com/blog/ai/agent-builder-best-practices)

**URL:** https://www.uipath.com/blog/ai/agent-builder-best-practices
**Domain:** www.uipath.com

**Excerpt:**

* **For deterministic tasks, use tools** : bound risk by calling proven UiPath automations or APIs as tools rather than letting the agent directly act, when the use case demands it. This increases predictability and safety. * **Align agent goals and measurable outcomes** : define clear objectives, performance metrics, and success criteria before design begins. Agents should operate within measurable boundaries. ## 2\. Configure context the right way

* **Index your enterprise context** : index the structured sources, knowledge bases (KBs), and documentation your agent will rely on. Good planning and context setup are key to reliable execution. Make sure you choose the right search strategy. Semantic search finds meaning-based matches in unstructured text and structured search retrieves exact data from defined schemas.
[DeepRAG](https://docs.uipath.com/activities/other/latest/integration-service/uipath-uipath-airdk-context-grounding-summary-deep-rag) combines both to reason deeply across large, complex, or mixed sources. * **Choose the right model** : UiPath Agent Builder in Studio is model-agnostic, therefore use the model best suited to your use case. GPT-5, for example, is generally more reliable than GPT-4. Use a different model for evaluation than for the agent itself to avoid bias. * **Maintain clarity in tool definitions** : use simple, descriptive tool names with lowercase alphanumeric characters and no spaces or special characters. Names must match what’s referenced in the prompt exactly. ## 3\. Treat every capability as a tool

* **Treat every external capability as a tool** : tools should have tight input/output contracts and clear success criteria. Reuse UiPath automations as tools whenever possible. * **Schema-driven prompts** : keep tool prompts concise and structured.
Validate output shapes and handle null or empty results explicitly. * **Document and version tools** : maintain clear versioning and evaluation history per tool. Link evaluation runs to specific versions. * **Build tools to increase reliability of the agent for deterministic tasks** : LLMs are not great at math, comparing dates, etc. In order to avoid any issues with the reliability of the agent, build tools that perform complex operations. ## 4\. Write prompts like product specs (not prose)

* **Iterative design and testing** : prompt engineering is an iterative craft, so use UiPath Agent Builder to refine your system prompts and task instructions by building proper evaluation sets and [testing](https://www.uipath.com/platform/agentic-testing) as you build.
* **Start with a system prompt that defines** :
  
    + Role and persona
    + Instructions
    + Goal and context
    + Success metrics
    + Guardrails and constraints
* **Use structured, multi-step reasoning** : incorporate chain-of-thought style reasoning for complex workflows. Explicitly define task decomposition, reasoning methods, and output formats. * **Be specific and as detailed as possible about the desired outcome** of your agent: make sure you define the proper output schema of your out arguments in UiPath Data Manager. Providing examples helps as well. * **Describe what should happen instead of what should** **_not_** **happen** : It's the difference between prompting your AI agent with “Do NOT ask for personal information” and “Avoid asking for personal information, instead refer the user to…”. * **Consider different prompts to accomplish the same task** : models have different implicit behavior.
 ... 
[Automation Hub](https://www.uipath.com/product/automation-hub)
* [Automation Ops](https://www.uipath.com/product/automation-ops)
* [Autopilot™](https://www.uipath.com/product/autopilot)

* [Data Service](https://www.uipath.com/product/no-code-data-modeling)
* [Insights](https://www.uipath.com/product/rpa-insights)
* [Integration Service](https://www.uipath.com/product/ui-api-integration-automation)
* [IXP](https://www.uipath.com/platform/agentic-automation/idp)
* [Marketplace](https://marketplace.uipath.com/)
* [Maestro](https://www.uipath.com/platform/agentic-automation/agentic-orchestration)
* [Orchestrator](https://www.uipath.com/product/orchestrator)


* [Process Mining](https://www.uipath.com/product/process-mining)
* [Robots](https://www.uipath.com/product/robots)
* [Studio](https://www.uipath.com/product/studio)
* [Task Mining](https://www.uipath.com/product/task-mining)
* [Test Cloud](https://www.uipath.com/product/test-cloud)

Solutions & Resources

###### Solutions

* [By

---

## 5. [Building a Minimalist AI Agent - Medium](https://medium.com/@romillyc/building-a-minimalist-ai-agent-2053e26dabba)

**URL:** https://medium.com/@romillyc/building-a-minimalist-ai-agent-2053e26dabba
**Domain:** medium.com

**Excerpt:**

I've been exploring how to build AI agents — programs that can use language models to accomplish tasks by breaking them down into steps and ...

---

## 6. [AI Agent Orchestration Patterns - Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)

**URL:** https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns
**Domain:** learn.microsoft.com

**Excerpt:**

These systems often exceed the abilities of a single agent that has access to many tools and knowledge sources. Instead, these systems use multi-agent orchestrations to handle complex, collaborative tasks reliably. This guide covers fundamental orchestration patterns for multi-agent architectures and helps you choose the approach that fits your specific requirements. ## Overview

When you use multiple AI agents, you can break down complex problems into specialized units of work or knowledge. You assign each task to dedicated AI agents that have specific capabilities. These approaches mirror strategies found in human teamwork. Using multiple agents provides several advantages compared to monolithic single-agent solutions. * **Specialization:** Individual agents can focus on a specific domain or capability, which reduces code and prompt complexity. * **Scalability:** Agents can be added or modified without redesigning the entire system.

---

## 7. [Writing effective tools for AI agents—using AI agents - Anthropic](https://www.anthropic.com/engineering/writing-tools-for-agents)

**URL:** https://www.anthropic.com/engineering/writing-tools-for-agents
**Domain:** www.anthropic.com

**Excerpt:**

[Skip to main content]() [Skip to footer]()

[](/)

* [Research](/research)
* [Economic Futures](/economic-futures)
* Commitments
* Learn
* [News](/news)

[Try Claude](https://claude.ai/)

[Engineering at Anthropic](/engineering)

# Writing effective tools for agents — with agents

Published Sep 11, 2025

Agents are only as effective as the tools we give them. We share how to write high-quality tools and evaluations, and how you can boost performance by using Claude to optimize its tools for itself. The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/docs/getting-started/intro) can empower LLM agents with potentially hundreds of tools to solve real-world tasks. But how do we make those tools maximally effective? In this post, we describe our most effective techniques for improving performance in a variety of agentic AI systems <sup>1</sup> .

---

## 8. [[PDF] A practical guide to building agents - OpenAI](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)

**URL:** https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf
**Domain:** cdn.openai.com

**Excerpt:**

If you’re exploring agents for your organization or preparing for your first deployment, feel free  

to reach out. Our team can provide the expertise, guidance, and hands-on support to ensure  

your success. 32

A practical guide to building agents

More resources

API Platform

OpenAI for Business

OpenAI Stories

ChatGPT Enterprise

OpenAI and Safety

Developer Docs

OpenAI is an AI research and deployment company. Our mission is to ensure that artificial general

intelligence benefits all of humanity. 33

A practical guide to building agents

---

## 9. [What Are AI Agents? | IBM](https://www.ibm.com/think/topics/ai-agents)

**URL:** https://www.ibm.com/think/topics/ai-agents
**Domain:** www.ibm.com

**Excerpt:**

These three stages or [agentic components](https://www.ibm.com/think/topics/components-of-ai-agents) define how agents operate:

### Goal initialization and planning

Although AI agents are autonomous in their decision-making processes, they require goals and predefined rules defined by humans. <sup>2</sup> There are three main influences on autonomous agent behavior:

* The team of developers that design and train the [agentic AI](https://www.ibm.com/think/topics/agentic-ai) system. * The team that deploys the agent and provides the user with access to it. * The user that provides the AI agent with specific goals to accomplish and establishes available tools to use. Given the user's goals and the agent’s available tools, the AI agent then performs task decomposition to improve performance. <sup>3</sup> Essentially, the agent creates a plan of specific tasks and subtasks to accomplish the complex goal. For simple tasks, planning is not a necessary step.

---

## 10. [Spec-driven development with AI: Get started with a new open ...](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)

**URL:** https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/
**Domain:** github.blog

**Excerpt:**

It generates small, reviewable chunks that each solve a specific piece of the puzzle. Each task should be something you can implement and test in isolation; this is crucial because it gives the coding agent a way to validate its work and stay on track, almost like a test-driven development process for your AI agent. Instead of “build authentication,” you get concrete tasks like “create a user registration endpoint that validates email format.”


1. **Implement** : Your coding agent tackles the tasks one by one (or in parallel, where applicable). But here’s what’s different: instead of reviewing thousand-line code dumps, you, the developer, review focused changes that solve specific problems. The coding agent knows what it’s supposed to build because the specification told it. It knows how to build it because the plan told it. And it knows exactly what to work on because the task told it. Crucially, your role isn’t just to steer. It’s to verify. At each phase, you reflect and refine.

---

## 11. [Three AI Design Patterns of Autonomous Agents | by Alexander Sniffin](https://alexsniffin.medium.com/three-ai-design-patterns-of-autonomous-agents-8372b9402f7c)

**URL:** https://alexsniffin.medium.com/three-ai-design-patterns-of-autonomous-agents-8372b9402f7c
**Domain:** alexsniffin.medium.com

**Excerpt:**

This approach is similar to a [delegation-like pattern](https://en.wikipedia.org/wiki/Delegation_pattern) . Rather than having a single agent that does everything, we can define agents that specialize in solving specific problems that also have different implementations. Instead of having the agent figure out who to communicate with, we can introduce an **orchestrator** that can both supervise and route between agents to get the best desired output based on the task. Example of a communication with an orchestration agent

By separating and abstracting communication, agents don’t need to know how a task is solved. Like the previous examples, an orchestration step can be defined using the FSM and the previous prompting techniques. ### Examples of Multi-Agent Implementations

Multi-agent implementations have been growing popular in the community to better scale tasks.

---

## 12. [What are AI Agents? - Artificial Intelligence](https://aws.amazon.com/what-is/ai-agents/)

**URL:** https://aws.amazon.com/what-is/ai-agents/
**Domain:** aws.amazon.com

**Excerpt:**

AI agents work by simplifying and automating complex tasks. Most autonomous agents follow a specific workflow when performing assigned tasks. ### Determine goals

The AI agent receives a specific instruction or goal from the user. It uses the goal to plan tasks that make the final outcome relevant and useful to the user. Then, the agent breaks down the goal into several smaller, actionable tasks. To achieve the goal, the agent performs those tasks based on specific orders or conditions. ### Acquire information

AI agents require information to execute tasks they have planned successfully. For example, the agent must extract conversation logs to analyze customer sentiments. As such, AI agents might access the internet to search for and retrieve the information they need. In some applications, an intelligent agent can interact with other agents or machine learning models to access or exchange information.

---

## 13. [Anthropic just showed how to make AI agents work on long projects ...](https://www.reddit.com/r/LocalLLaMA/comments/1p7siuu/anthropic_just_showed_how_to_make_ai_agents_work/)

**URL:** https://www.reddit.com/r/LocalLLaMA/comments/1p7siuu/anthropic_just_showed_how_to_make_ai_agents_work/
**Domain:** www.reddit.com

**Excerpt:**

[Skip to main content]() Open menu Open navigation [](/) Go to Reddit Home

r/LocalLLaMA A chip A close button

[Log In](https://www.reddit.com/login/) Log in to Reddit

Expand user menu Open settings menu

[Go to LocalLLaMA](/r/LocalLLaMA/) [r/LocalLLaMA](/r/LocalLLaMA/) •

[purealgo](/user/purealgo/) [Français](https://www.reddit.com/r/LocalLLaMA/comments/1p7siuu/anthropic_just_showed_how_to_make_ai_agents_work/?tl=fr) [Português (Brasil)](https://www.reddit.com/r/LocalLLaMA/comments/1p7siuu/anthropic_just_showed_how_to_make_ai_agents_work/?tl=pt-br) [Español (Latinoamérica)](https://www.reddit.com/r/LocalLLaMA/comments/1p7siuu/anthropic_just_showed_how_to_make_ai_agents_work/?tl=es-419)

# Anthropic just showed how to make AI agents work on long projects without falling apart

Most AI agents forget everything between sessions, which means they completely lose track of long tasks. Anthropic’s new article shows a surprisingly practical fix.

---

## 14. [Best practices for the AI Agent action - Tines Explained](https://explained.tines.com/en/articles/11644147-best-practices-for-the-ai-agent-action)

**URL:** https://explained.tines.com/en/articles/11644147-best-practices-for-the-ai-agent-action
**Domain:** explained.tines.com

**Excerpt:**

## Specify end results with Output Schema

Using the **Output Schema** feature via the `+ Option` button of the AI Agent action helps enforce consistency and ensures the output follows a specific format, making it easier to parse and use the event data programmatically. You can utilize the **Prompt** and **System instructions** by referencing the **Output Schema** to organize how the result data should be structured. **Tip** : Check out the [JSON Schema website](https://json-schema.org/learn/miscellaneous-examples) to learn more about successfully building a structure for the **Output Schema** . ### Output Schema example

Build an AI Agent action in **Task** mode that acts as a user investigation and enrichment agent. Define the **Output Schema** and clarify the requirements for using it throughout the **System instructions** and **Prompt** :

## Set up monitoring

We recommend setting up failure **Monitoring** for all actions across your stories.

---

## 15. [Zero to One: Learning Agentic Patterns - Philschmid](https://www.philschmid.de/agentic-pattern)

**URL:** https://www.philschmid.de/agentic-pattern
**Domain:** www.philschmid.de

**Excerpt:**

[Philschmid](/)

Search `⌘ k`

[Blog](/) [Projects](/projects) [Newsletter](/cloud-attention) [About Me](/philipp-schmid)

Toggle Menu

# Zero to One: Learning Agentic Patterns

May 5, 2025 16 minute read [View Code](https://github.com/philschmid/gemini-samples/blob/main/guides/agentic-pattern.ipynb)

AI agents. Agentic AI. Agentic architectures. Agentic workflows. Agentic patterns. Agents are everywhere. But what exactly _are_ they, and how do we build robust and effective agentic systems? While the term "agent" is used broadly, a key characteristic is their ability to dynamically plan and execute tasks, often leveraging external tools and memory to achieve complex goals. This post aims to explore common design patterns. Think of these patterns as blueprints or reusable templates for building AI applications. Understanding them provides a mental model for tackling complex problems and designing systems that are scalable, modular, and adaptable.

---
