/**
 * Orchestration layer for Chrome's Built-in AI (Gemini Nano).
 * Supports summarization and language model prompting.
 */

export async function getAIStatus() {
  const isSecure = self.isSecureContext;
  if (!isSecure) {
    return { available: 'no', message: 'AI APIs require a secure context (HTTPS/Extension).' };
  }

  // Check for the new namespaces
  const aiNamespace = self.ai || (typeof LanguageModel !== 'undefined' ? { languageModel: LanguageModel } : null);

  if (!aiNamespace) {
    return { 
      available: 'no', 
      message: 'Built-in AI not found. Ensure Chrome is updated and flags are enabled.' 
    };
  }
  
  try {
    const summarizerCaps = await aiNamespace.summarizer?.capabilities() || { available: 'no' };
    const modelCaps = await aiNamespace.languageModel?.capabilities() || { available: 'no' };
    
    console.log('[OnboardAI] Capabilities:', { summarizer: summarizerCaps.available, model: modelCaps.available });

    if (summarizerCaps.available === 'no' && modelCaps.available === 'no') {
      return { 
        available: 'no', 
        message: 'AI models disabled. Check chrome://components for "Optimization Guide".' 
      };
    }
    
    if (summarizerCaps.available === 'after-download' || modelCaps.available === 'after-download') {
      return { 
        available: 'downloadable', 
        message: 'Model is downloading. Check chrome://components for progress.' 
      };
    }
    
    return { 
      available: 'ready', 
      message: 'Onboard AI is ready.' 
    };
  } catch (e) {
    return { 
      available: 'no', 
      message: `Status check failed: ${e.message}` 
    };
  }
}

/**
 * Summarizes the provided text using the built-in summarizer.
 */
export async function summarizeContent(text, options = {}) {
  if (!text || text.trim().length < 100) return null;
  
  try {
    const summarizer = await self.ai.summarizer.create({
      type: options.type || 'tl-dr',
      format: options.format || 'markdown',
      length: options.length || 'medium',
      sharedContext: 'Summarize the following web content extracted from a bookmark.'
    });
    
    const summary = await summarizer.summarize(text);
    summarizer.destroy();
    return summary;
  } catch (e) {
    console.error('[OnboardAI] Summarization failed:', e);
    return null;
  }
}

/**
 * Suggests tags based on the content using the prompt API.
 */
export async function suggestTags(text, existingTags = []) {
  if (!text) return [];
  
  try {
    const session = await self.ai.languageModel.create({
      systemPrompt: `You are a knowledge management assistant. Analyze the provided text and suggest 3-5 concise tags for an Obsidian vault. 
      Return only a comma-separated list of tags. Do not include explanations.
      ${existingTags.length > 0 ? `Context: Existing vault tags include: ${existingTags.join(', ')}` : ''}`
    });
    
    // Use a subset of text to avoid context limits
    const sample = text.slice(0, 4000);
    const response = await session.prompt(sample);
    session.destroy();
    
    if (!response) return [];
    
    return response.split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(t => t.length > 0 && t.length < 20);
  } catch (e) {
    console.error('[OnboardAI] Tag suggestion failed:', e);
    return [];
  }
}
