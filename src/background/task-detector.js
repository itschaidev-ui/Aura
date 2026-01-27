// src/background/task-detector.js
export class TaskDetector {
  static extractTasks(text) {
    const tasks = [];
    
    // Pattern 1: Markdown-style tasks "- [ ] Task description"
    const markdownPattern = /-?\s*\[[\sx]\]\s*(.+)/gi;
    let match;
    while ((match = markdownPattern.exec(text)) !== null) {
      tasks.push({
        text: match[1].trim(),
        completed: false,
        source: 'markdown'
      });
    }
    
    // Pattern 2: TODO items "TODO: Task description"
    const todoPattern = /TODO[:\-]?\s*(.+)/gi;
    while ((match = todoPattern.exec(text)) !== null) {
      tasks.push({
        text: match[1].trim(),
        completed: false,
        source: 'todo'
      });
    }
    
    // Pattern 3: Action items "Action: Task description" or "Action item: Task"
    const actionPattern = /(?:Action\s*(?:item)?[:\-]?|Next\s*step[:\-]?)\s*(.+)/gi;
    while ((match = actionPattern.exec(text)) !== null) {
      tasks.push({
        text: match[1].trim(),
        completed: false,
        source: 'action'
      });
    }
    
    // Pattern 4: Numbered tasks "1. Task" or "- Task"
    const numberedPattern = /(?:^\s*(?:\d+\.|[-*])\s+)(.+)$/gm;
    while ((match = numberedPattern.exec(text)) !== null) {
      const taskText = match[1].trim();
      // Filter out very short items (likely not tasks)
      if (taskText.length > 10 && !taskText.match(/^[a-z]/)) {
        tasks.push({
          text: taskText,
          completed: false,
          source: 'list'
        });
      }
    }
    
    // Remove duplicates
    const uniqueTasks = [];
    const seen = new Set();
    for (const task of tasks) {
      const key = task.text.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTasks.push(task);
      }
    }
    
    return uniqueTasks;
  }
  
  static extractTasksFromConversation(conversation) {
    const allTasks = [];
    
    for (const message of conversation) {
      if (message.role === 'assistant') {
        const tasks = this.extractTasks(message.content);
        allTasks.push(...tasks);
      }
    }
    
    return allTasks;
  }
}