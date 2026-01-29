/**
 * Clawdbot Skill Loader
 * Loads and executes Clawdbot-style skills
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const axios = require('axios');

const execAsync = promisify(exec);

class SkillLoader {
  constructor(options = {}) {
    this.skillsDir = options.skillsDir || path.join(__dirname, '..', '..', '..', 'skills');
    this.clawdSkillsDir = options.clawdSkillsDir || path.join(require('os').homedir(), '.clawdbot', 'skills');
    this.loadedSkills = new Map();
    this.skillCache = new Map();
  }

  /**
   * Load all available skills
   */
  async loadAllSkills() {
    const skills = [];
    
    // Load from Zidni skills directory
    try {
      const zidniSkills = await this.loadSkillsFromDir(this.skillsDir);
      skills.push(...zidniSkills);
    } catch (error) {
      console.log('[Skills] No Zidni skills directory');
    }

    // Load from Clawdbot skills directory
    try {
      const clawdSkills = await this.loadSkillsFromDir(this.clawdSkillsDir);
      skills.push(...clawdSkills);
    } catch (error) {
      console.log('[Skills] No Clawdbot skills directory');
    }

    // Also check for npm-installed skills
    try {
      const npmSkills = await this.loadNpmSkills();
      skills.push(...npmSkills);
    } catch (error) {
      console.log('[Skills] No npm skills found');
    }

    return skills;
  }

  /**
   * Load skills from a directory
   */
  async loadSkillsFromDir(dir) {
    const skills = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillName = entry.name;
          const skillPath = path.join(dir, skillName);
          const skill = await this.parseSkill(skillName, skillPath);
          
          if (skill) {
            skills.push(skill);
            this.loadedSkills.set(skillName, skill);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or is empty
    }

    return skills;
  }

  /**
   * Parse a skill from its directory
   */
  async parseSkill(name, skillPath) {
    try {
      // Read SKILL.md
      const skillMdPath = path.join(skillPath, 'SKILL.md');
      let skillMd = '';
      
      try {
        skillMd = await fs.readFile(skillMdPath, 'utf-8');
      } catch (e) {
        // No SKILL.md, try to infer from package.json
      }

      // Read package.json if exists
      const packageJsonPath = path.join(skillPath, 'package.json');
      let packageJson = {};
      
      try {
        packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      } catch (e) {
        // No package.json
      }

      // Read index.js if exists
      const indexPath = path.join(skillPath, 'index.js');
      let hasImplementation = false;
      
      try {
        await fs.access(indexPath);
        hasImplementation = true;
      } catch (e) {
        // No implementation
      }

      // Parse SKILL.md for metadata
      const metadata = this.parseSkillMd(skillMd);

      return {
        name: metadata.name || name,
        description: metadata.description || packageJson.description || `Skill: ${name}`,
        version: metadata.version || packageJson.version || '1.0.0',
        author: metadata.author || packageJson.author || 'Unknown',
        path: skillPath,
        hasImplementation,
        tools: metadata.tools || [],
        config: metadata.config || {},
        keywords: metadata.keywords || packageJson.keywords || [],
        ...metadata
      };
    } catch (error) {
      console.error(`[Skills] Failed to parse skill ${name}:`, error.message);
      return null;
    }
  }

  /**
   * Parse SKILL.md content
   */
  parseSkillMd(content) {
    const metadata = {
      name: '',
      description: '',
      version: '1.0.0',
      tools: [],
      config: {}
    };

    if (!content) return metadata;

    // Extract name (first heading)
    const nameMatch = content.match(/^#\s+(.+)$/m);
    if (nameMatch) metadata.name = nameMatch[1].trim();

    // Extract description
    const descMatch = content.match(/^##?\s*Description\s*\n+(.+?)(?=\n##|\n*$)/is);
    if (descMatch) metadata.description = descMatch[1].trim();

    // Extract version
    const versionMatch = content.match(/version[:\s]+([\d.]+)/i);
    if (versionMatch) metadata.version = versionMatch[1];

    // Extract tools
    const toolsMatch = content.match(/##?\s*Tools\s*\n+([\s\S]+?)(?=\n##|\n*$)/i);
    if (toolsMatch) {
      const toolsText = toolsMatch[1];
      const toolMatches = toolsText.matchAll(/[-*]\s*(\w+)[\s:-]+(.+)/g);
      for (const match of toolMatches) {
        metadata.tools.push({
          name: match[1].trim(),
          description: match[2].trim()
        });
      }
    }

    // Extract config
    const configMatch = content.match(/##?\s*Config\s*\n+([\s\S]+?)(?=\n##|\n*$)/i);
    if (configMatch) {
      const configText = configMatch[1];
      const configMatches = configText.matchAll(/[-*]\s*(\w+)[\s:-]+(.+)/g);
      for (const match of configMatches) {
        metadata.config[match[1].trim()] = match[2].trim();
      }
    }

    return metadata;
  }

  /**
   * Load npm-installed skills
   */
  async loadNpmSkills() {
    const skills = [];
    
    try {
      const { stdout } = await execAsync('npm list -g --depth=0 --json');
      const packages = JSON.parse(stdout);
      
      for (const [name, info] of Object.entries(packages.dependencies || {})) {
        if (name.startsWith('clawd-skill-') || name.startsWith('zidni-skill-')) {
          const skillName = name.replace(/^(clawd|zidni)-skill-/, '');
          skills.push({
            name: skillName,
            description: info.description || `NPM skill: ${skillName}`,
            version: info.version,
            path: info.path,
            fromNpm: true,
            npmPackage: name
          });
        }
      }
    } catch (error) {
      // npm list might fail
    }

    return skills;
  }

  /**
   * Execute a skill
   */
  async execute(skillName, params = {}) {
    const skill = this.loadedSkills.get(skillName);
    
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    // Check cache
    const cacheKey = `${skillName}:${JSON.stringify(params)}`;
    if (this.skillCache.has(cacheKey)) {
      return this.skillCache.get(cacheKey);
    }

    let result;

    // Try to execute implementation
    if (skill.hasImplementation) {
      try {
        const impl = require(path.join(skill.path, 'index.js'));
        
        if (typeof impl.execute === 'function') {
          result = await impl.execute(params);
        } else if (typeof impl.default === 'function') {
          result = await impl.default(params);
        } else if (typeof impl === 'function') {
          result = await impl(params);
        } else {
          throw new Error(`Skill ${skillName} has no execute function`);
        }
      } catch (error) {
        console.error(`[Skills] Execution failed for ${skillName}:`, error.message);
        throw error;
      }
    } else {
      // No implementation - try to use AI to simulate
      result = await this.simulateSkill(skill, params);
    }

    // Cache result
    this.skillCache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Simulate a skill using AI
   */
  async simulateSkill(skill, params) {
    // This would integrate with your AI provider
    console.log(`[Skills] Simulating skill: ${skill.name}`);
    
    return {
      simulated: true,
      skill: skill.name,
      params,
      message: `Simulated execution of ${skill.name}`
    };
  }

  /**
   * Install a skill from npm or git
   */
  async installSkill(source) {
    try {
      let installCmd;
      
      if (source.startsWith('http')) {
        // Git URL
        installCmd = `npm install -g ${source}`;
      } else if (source.includes('/')) {
        // GitHub shorthand
        installCmd = `npm install -g github:${source}`;
      } else {
        // NPM package
        installCmd = `npm install -g ${source}`;
      }

      console.log(`[Skills] Installing: ${source}`);
      const { stdout, stderr } = await execAsync(installCmd);
      
      if (stderr && !stderr.includes('WARN')) {
        throw new Error(stderr);
      }

      // Reload skills
      await this.loadAllSkills();
      
      return { success: true, output: stdout };
    } catch (error) {
      console.error(`[Skills] Install failed:`, error.message);
      throw error;
    }
  }

  /**
   * Uninstall a skill
   */
  async uninstallSkill(skillName) {
    try {
      const skill = this.loadedSkills.get(skillName);
      
      if (!skill) {
        throw new Error(`Skill not found: ${skillName}`);
      }

      if (skill.fromNpm && skill.npmPackage) {
        await execAsync(`npm uninstall -g ${skill.npmPackage}`);
      }

      this.loadedSkills.delete(skillName);
      
      return { success: true };
    } catch (error) {
      console.error(`[Skills] Uninstall failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get skill info
   */
  getSkill(name) {
    return this.loadedSkills.get(name);
  }

  /**
   * Get all loaded skills
   */
  getAllSkills() {
    return Array.from(this.loadedSkills.values());
  }

  /**
   * Clear skill cache
   */
  clearCache() {
    this.skillCache.clear();
  }
}

module.exports = { SkillLoader };
