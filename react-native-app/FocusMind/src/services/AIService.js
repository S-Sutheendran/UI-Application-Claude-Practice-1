// AI Service using Anthropic REST API directly (React Native compatible)
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are FocusMind AI — an intelligent productivity assistant built into the FocusMind app.
You help users:
1. Plan their day and tasks effectively
2. Create structured schedules and Pomodoro plans
3. Suggest task priorities and time estimates
4. Provide productivity tips and recommendations
5. Break down complex projects into subtasks
6. Analyze work patterns and suggest improvements
7. Create actionable plans when asked

When creating tasks or schedules, format them clearly. When the user asks to create a plan,
return a structured list of tasks with priorities (high/medium/low) and estimated durations.
Keep responses concise, actionable, and encouraging.`;

class AIServiceClass {
  constructor() {
    this.apiKey = '';
    this.conversationHistory = [];
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  async sendMessage(userMessage, conversationHistory = []) {
    if (!this.apiKey) {
      return this._mockResponse(userMessage);
    }

    const messages = [
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-7',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      return this._mockResponse(userMessage);
    }
  }

  async getSuggestions(tasks, completedToday, focusMinutes) {
    const context = `User has ${tasks.length} pending tasks. Completed ${completedToday} tasks today. Focused for ${focusMinutes} minutes today.
Top pending tasks: ${tasks.slice(0, 5).map(t => `"${t.title}" (${t.priority} priority)`).join(', ')}`;

    const prompt = `Based on the user's current state, give 3 brief, specific productivity suggestions or insights. Keep each under 20 words.`;

    const response = await this.sendMessage(prompt + '\n\nContext: ' + context, []);
    return this._parseSuggestions(response);
  }

  async createPlan(description) {
    const prompt = `Create a structured task plan for: "${description}".
Return a JSON array of tasks with this exact format:
[{"title": "Task name", "priority": "high|medium|low", "estimatedMinutes": 25, "notes": "optional detail"}]
Return ONLY the JSON array, no other text.`;

    try {
      const response = await this.sendMessage(prompt, []);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {}
    return this._mockPlan(description);
  }

  async analyzeProductivity(stats) {
    const prompt = `Analyze this productivity data and give 2-3 specific insights:
- Total focus time this week: ${stats.weeklyFocusMinutes} minutes
- Tasks completed: ${stats.weeklyTasksCompleted}
- Pomodoros done: ${stats.weeklyPomodoros}
- Best day: ${stats.bestDay}
Keep insights motivational and actionable, each under 25 words.`;

    return this.sendMessage(prompt, []);
  }

  // Offline mock responses when no API key
  _mockResponse(message) {
    const lower = message.toLowerCase();

    if (lower.includes('plan') || lower.includes('schedule')) {
      return `Here's a structured plan for you:

📋 **Morning Block (9:00–11:00)**
• Review priorities and emails — 20 min
• Deep work session (Pomodoro ×4) — 100 min

🍽️ **Midday (11:00–12:00)**
• Quick tasks and responses — 30 min
• Break and lunch — 30 min

⚡ **Afternoon Block (13:00–16:00)**
• Focus project work (Pomodoro ×4) — 100 min
• Review & wrap-up — 20 min

💡 **Tip:** Use the Pomodoro timer for each work block!`;
    }

    if (lower.includes('suggest') || lower.includes('recommend')) {
      return `Here are my top suggestions for you today:

1. 🎯 **Start with your hardest task first** — your energy is highest in the morning
2. ⏱️ **Use 25-min Pomodoros** — batch similar tasks together for flow state
3. 📵 **Enable Focus Mode** during sessions — turn off notifications
4. 🔋 **Take real breaks** — step away from screens every 90 minutes
5. ✅ **Set a daily highlight** — one must-complete task per day`;
    }

    if (lower.includes('task') || lower.includes('todo')) {
      return `I can help you manage your tasks! Here are some strategies:

• **Prioritize** with the Eisenhower Matrix (urgent vs important)
• **Time-block** your tasks in the calendar
• **Break down** large tasks into 25-min subtasks
• **Group** similar tasks to minimize context switching

Would you like me to help create a specific task plan?`;
    }

    if (lower.includes('pomodoro') || lower.includes('focus') || lower.includes('timer')) {
      return `The Pomodoro Technique works best when you:

🍅 **Classic Setup:** 25 min focus → 5 min break → repeat × 4 → 15 min long break

**Pro tips:**
• Pick ONE task before starting the timer
• Log what you complete each session
• Adjust intervals in Settings if 25 min feels too long/short
• Use Focus Sounds (Rain, Café) to block distractions`;
    }

    return `I'm FocusMind AI, your productivity assistant! I can help you:

• 📋 **Plan your day** — "Create a study plan for today"
• ✅ **Organize tasks** — "Help me prioritize my tasks"
• 🍅 **Optimize Pomodoros** — "Best Pomodoro strategy for deep work"
• 📊 **Analyze patterns** — "How can I be more productive?"
• 🗒️ **Structure projects** — "Break down my project X"

What would you like help with?`;
  }

  _mockPlan(description) {
    return [
      { title: `Research & gather resources for ${description}`, priority: 'high', estimatedMinutes: 25, notes: 'Collect all needed materials first' },
      { title: 'Create outline and structure', priority: 'high', estimatedMinutes: 25, notes: 'Map out the key components' },
      { title: 'First draft / implementation', priority: 'high', estimatedMinutes: 50, notes: 'Focus block — two Pomodoros' },
      { title: 'Review and refine', priority: 'medium', estimatedMinutes: 25, notes: 'Check for gaps or issues' },
      { title: 'Final polish and delivery', priority: 'medium', estimatedMinutes: 25, notes: 'Proofread and finalize' },
    ];
  }

  _parseSuggestions(text) {
    const lines = text.split('\n').filter(l => l.trim().length > 10).slice(0, 3);
    return lines.map(l => l.replace(/^[\d•\-\*\.]+\s*/, '').trim());
  }
}

const AIService = new AIServiceClass();
export default AIService;
