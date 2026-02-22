/**
 * HEREV (חרב) — GENESIS Security Arsenal
 * Hebrew: Sword — The blade that guards the realm
 *
 * Curated security resources, tools, and intelligence feeds
 * integrated into the GENESIS 2.0 sovereign security platform.
 *
 * @module herev-arsenal
 * @version 1.0.0
 * @author murray-ux
 */

import { Kol } from './kol-logger.js';

const log = new Kol('HEREV');

/**
 * Security Arsenal Categories
 */
const ARSENAL_CATEGORIES = {
  OFFENSIVE: 'offensive',
  DEFENSIVE: 'defensive',
  FORENSICS: 'forensics',
  INTELLIGENCE: 'intelligence',
  TRAINING: 'training',
  TOOLS: 'tools',
  PAYLOADS: 'payloads',
  OSINT: 'osint',
  MOBILE: 'mobile',
  WEB: 'web',
  NETWORK: 'network',
  IOT: 'iot',
  CRYPTO: 'crypto',
  MALWARE: 'malware',
  CTF: 'ctf',
  CLOUD: 'cloud',
  AI_SECURITY: 'ai_security'
};

/**
 * Curated Security Arsenal
 * Parsed from GENESIS data dump — Feb 2026
 */
const SECURITY_ARSENAL = {
  // ═══════════════════════════════════════════════════════════════════════════
  // MASTER COLLECTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  masterCollections: [
    {
      id: 'seclists',
      name: 'SecLists',
      description: 'The security tester\'s companion — usernames, passwords, URLs, fuzzing payloads, web shells',
      url: 'https://github.com/danielmiessler/SecLists',
      category: ARSENAL_CATEGORIES.PAYLOADS,
      stars: '55k+',
      priority: 'critical'
    },
    {
      id: 'payloads-all-the-things',
      name: 'PayloadsAllTheThings',
      description: 'List of useful payloads and bypass for Web Application Security and Pentest/CTF',
      url: 'https://github.com/swisskyrepo/PayloadsAllTheThings',
      category: ARSENAL_CATEGORIES.PAYLOADS,
      stars: '60k+',
      priority: 'critical'
    },
    {
      id: 'the-hacker',
      name: 'The Art of Hacking',
      description: 'Comprehensive resource for ethical hacking and security research',
      url: 'https://github.com/The-Art-of-Hacking/h4cker',
      category: ARSENAL_CATEGORIES.TRAINING,
      stars: '18k+',
      priority: 'high'
    },
    {
      id: 'ultimate-cybersecurity',
      name: 'Ultimate Cybersecurity Resources',
      description: 'Curated list of cybersecurity resources for learning and practicing',
      url: 'https://github.com/DhanushNehru/Ultimate-Cybersecurity-Resources',
      category: ARSENAL_CATEGORIES.TRAINING,
      priority: 'high'
    },
    {
      id: 'cybersources',
      name: 'CyberSources',
      description: 'Comprehensive cybersecurity resource collection',
      url: 'https://github.com/brunoooost/cybersources',
      category: ARSENAL_CATEGORIES.TRAINING,
      priority: 'medium'
    },
    {
      id: 'hacker-roadmap',
      name: 'Hacker Roadmap',
      description: 'Your beginner pen testing start guide',
      url: 'https://github.com/sundowndev/hacker-roadmap',
      category: ARSENAL_CATEGORIES.TRAINING,
      priority: 'high'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // OFFENSIVE SECURITY
  // ═══════════════════════════════════════════════════════════════════════════
  offensive: [
    {
      id: 'awesome-pentest',
      name: 'Awesome Pentest',
      description: 'Collection of penetration testing resources and tools',
      url: 'https://github.com/enaqx/awesome-pentest',
      category: ARSENAL_CATEGORIES.OFFENSIVE,
      priority: 'critical'
    },
    {
      id: 'awesome-hacking',
      name: 'Awesome Hacking',
      description: 'Curated list of hacking tools, resources, and references',
      url: 'https://github.com/carpedm20/awesome-hacking',
      category: ARSENAL_CATEGORIES.OFFENSIVE,
      priority: 'high'
    },
    {
      id: 'awesome-hacking-resources',
      name: 'Awesome Hacking Resources',
      description: 'Collection of hacking/penetration testing resources',
      url: 'https://github.com/vitalysim/Awesome-Hacking-Resources',
      category: ARSENAL_CATEGORIES.OFFENSIVE,
      priority: 'high'
    },
    {
      id: 'awesome-red-teaming',
      name: 'Awesome Red Teaming',
      description: 'Red teaming resources for adversary simulation',
      url: 'https://github.com/yeyintminthuhtut/Awesome-Red-Teaming',
      category: ARSENAL_CATEGORIES.OFFENSIVE,
      priority: 'critical'
    },
    {
      id: 'pentest-wiki',
      name: 'Pentest Wiki',
      description: 'Penetration testing knowledge base',
      url: 'https://github.com/nixawk/pentest-wiki',
      category: ARSENAL_CATEGORIES.OFFENSIVE,
      priority: 'high'
    },
    {
      id: 'pentest-cheatsheets',
      name: 'Pentest Cheatsheets',
      description: 'Cheatsheets for penetration testing',
      url: 'https://github.com/coreb1t/awesome-pentest-cheat-sheets',
      category: ARSENAL_CATEGORIES.OFFENSIVE,
      priority: 'high'
    },
    {
      id: 'capsulecorp-pentest',
      name: 'Capsulecorp Pentest',
      description: 'Pentest network with vulnerabilities for training',
      url: 'https://github.com/r3dy/capsulecorp-pentest',
      category: ARSENAL_CATEGORIES.TRAINING,
      priority: 'medium'
    },
    {
      id: 'gtfobins',
      name: 'GTFOBins',
      description: 'Unix binaries that can be exploited for privilege escalation',
      url: 'https://gtfobins.github.io/',
      category: ARSENAL_CATEGORIES.OFFENSIVE,
      priority: 'critical'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFENSIVE SECURITY
  // ═══════════════════════════════════════════════════════════════════════════
  defensive: [
    {
      id: 'awesome-security',
      name: 'Awesome Security',
      description: 'Curated list of security resources and tools',
      url: 'https://github.com/sbilly/awesome-security',
      category: ARSENAL_CATEGORIES.DEFENSIVE,
      priority: 'critical'
    },
    {
      id: 'awesome-devsecops',
      name: 'Awesome DevSecOps',
      description: 'DevSecOps resources, tools, and best practices',
      url: 'https://github.com/devsecops/awesome-devsecops',
      category: ARSENAL_CATEGORIES.DEFENSIVE,
      priority: 'critical'
    },
    {
      id: 'awesome-appsec',
      name: 'Awesome AppSec',
      description: 'Application security resources and learning materials',
      url: 'https://github.com/paragonie/awesome-appsec',
      category: ARSENAL_CATEGORIES.DEFENSIVE,
      priority: 'high'
    },
    {
      id: 'api-security-checklist',
      name: 'API Security Checklist',
      description: 'Checklist for securing API endpoints',
      url: 'https://github.com/shieldfy/API-Security-Checklist',
      category: ARSENAL_CATEGORIES.DEFENSIVE,
      priority: 'critical'
    },
    {
      id: 'security-cheatsheets',
      name: 'Security Cheatsheets',
      description: 'Security cheatsheets collection',
      url: 'https://github.com/andrewjkerr/security-cheatsheets',
      category: ARSENAL_CATEGORIES.DEFENSIVE,
      priority: 'high'
    },
    {
      id: 'security-list',
      name: 'Security List',
      description: 'Curated security resources',
      url: 'https://github.com/zbetcheckin/Security_list',
      category: ARSENAL_CATEGORIES.DEFENSIVE,
      priority: 'medium'
    },
    {
      id: 'detection-lab',
      name: 'DetectionLab',
      description: 'Build a lab environment for security testing',
      url: 'https://github.com/clong/DetectionLab',
      category: ARSENAL_CATEGORIES.DEFENSIVE,
      priority: 'high'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // INCIDENT RESPONSE & FORENSICS
  // ═══════════════════════════════════════════════════════════════════════════
  forensics: [
    {
      id: 'awesome-incident-response',
      name: 'Awesome Incident Response',
      description: 'Tools and resources for incident response',
      url: 'https://github.com/meirwah/awesome-incident-response',
      category: ARSENAL_CATEGORIES.FORENSICS,
      priority: 'critical'
    },
    {
      id: 'awesome-forensics',
      name: 'Awesome Forensics',
      description: 'Digital forensics resources and tools',
      url: 'https://github.com/Cugu/awesome-forensics',
      category: ARSENAL_CATEGORIES.FORENSICS,
      priority: 'critical'
    },
    {
      id: 'awesome-malware-analysis',
      name: 'Awesome Malware Analysis',
      description: 'Malware analysis tools and resources',
      url: 'https://github.com/rshipp/awesome-malware-analysis',
      category: ARSENAL_CATEGORIES.MALWARE,
      priority: 'critical'
    },
    {
      id: 'cyberchef',
      name: 'CyberChef',
      description: 'The Cyber Swiss Army Knife by GCHQ',
      url: 'https://gchq.github.io/CyberChef/',
      category: ARSENAL_CATEGORIES.TOOLS,
      priority: 'critical'
    },
    {
      id: 'awesome-yara',
      name: 'Awesome YARA',
      description: 'YARA rules and resources for malware detection',
      url: 'https://github.com/InQuest/awesome-yara',
      category: ARSENAL_CATEGORIES.MALWARE,
      priority: 'high'
    },
    {
      id: 'awesome-iocs',
      name: 'Awesome IOCs',
      description: 'Indicators of Compromise resources',
      url: 'https://github.com/sroberts/awesome-iocs',
      category: ARSENAL_CATEGORIES.INTELLIGENCE,
      priority: 'high'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // THREAT INTELLIGENCE
  // ═══════════════════════════════════════════════════════════════════════════
  intelligence: [
    {
      id: 'awesome-threat-intelligence',
      name: 'Awesome Threat Intelligence',
      description: 'Threat intelligence resources and platforms',
      url: 'https://github.com/hslatman/awesome-threat-intelligence',
      category: ARSENAL_CATEGORIES.INTELLIGENCE,
      priority: 'critical'
    },
    {
      id: 'threat-hunter-playbook',
      name: 'ThreatHunter Playbook',
      description: 'Threat hunting techniques and methodologies',
      url: 'https://github.com/Cyb3rWard0g/ThreatHunter-Playbook',
      category: ARSENAL_CATEGORIES.INTELLIGENCE,
      priority: 'critical'
    },
    {
      id: 'apt-notes',
      name: 'APT Notes',
      description: 'Collection of APT campaign reports and analysis',
      url: 'https://github.com/kbandla/APTnotes',
      category: ARSENAL_CATEGORIES.INTELLIGENCE,
      priority: 'high'
    },
    {
      id: 'awesome-honeypots',
      name: 'Awesome Honeypots',
      description: 'Honeypot resources and implementations',
      url: 'https://github.com/paralax/awesome-honeypots',
      category: ARSENAL_CATEGORIES.INTELLIGENCE,
      priority: 'high'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // WEB SECURITY
  // ═══════════════════════════════════════════════════════════════════════════
  web: [
    {
      id: 'awesome-web-security',
      name: 'Awesome Web Security',
      description: 'Web application security resources',
      url: 'https://github.com/qazbnm456/awesome-web-security',
      category: ARSENAL_CATEGORIES.WEB,
      priority: 'critical'
    },
    {
      id: 'awesome-web-hacking',
      name: 'Awesome Web Hacking',
      description: 'Web hacking techniques and resources',
      url: 'https://github.com/infoslack/awesome-web-hacking',
      category: ARSENAL_CATEGORIES.WEB,
      priority: 'high'
    },
    {
      id: 'awesome-web3-security',
      name: 'Awesome Web3 Security',
      description: 'Web3, blockchain, and smart contract security',
      url: 'https://github.com/Anugrahsr/Awesome-web3-Security',
      category: ARSENAL_CATEGORIES.WEB,
      priority: 'high'
    },
    {
      id: 'awesome-bug-bounty',
      name: 'Awesome Bug Bounty',
      description: 'Bug bounty resources and writeups',
      url: 'https://github.com/djadmin/awesome-bug-bounty',
      category: ARSENAL_CATEGORIES.WEB,
      priority: 'high'
    },
    {
      id: 'bug-bounty-reference',
      name: 'Bug Bounty Reference',
      description: 'Bug bounty writeups by vulnerability type',
      url: 'https://github.com/ngalongc/bug-bounty-reference',
      category: ARSENAL_CATEGORIES.WEB,
      priority: 'high'
    },
    {
      id: 'hacker101',
      name: 'Hacker101',
      description: 'Free class for web security',
      url: 'https://github.com/Hacker0x01/hacker101',
      category: ARSENAL_CATEGORIES.TRAINING,
      priority: 'high'
    },
    {
      id: 'awesome-serverless-security',
      name: 'Awesome Serverless Security',
      description: 'Serverless security resources',
      url: 'https://github.com/puresec/awesome-serverless-security/',
      category: ARSENAL_CATEGORIES.CLOUD,
      priority: 'medium'
    },
    {
      id: 'awesome-php-security',
      name: 'Awesome PHP Security',
      description: 'PHP security libraries and resources',
      url: 'https://github.com/ziadoz/awesome-php#security',
      category: ARSENAL_CATEGORIES.WEB,
      priority: 'medium'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // VULNERABILITY RESEARCH
  // ═══════════════════════════════════════════════════════════════════════════
  vulnerabilities: [
    {
      id: 'awesome-vulnerability-research',
      name: 'Awesome Vulnerability Research',
      description: 'Vulnerability research resources',
      url: 'https://github.com/re-pronin/awesome-vulnerability-research',
      category: ARSENAL_CATEGORIES.OFFENSIVE,
      priority: 'high'
    },
    {
      id: 'vulhub',
      name: 'Vulhub',
      description: 'Pre-built vulnerable docker environments for testing',
      url: 'https://github.com/vulhub/vulhub',
      category: ARSENAL_CATEGORIES.TRAINING,
      priority: 'critical'
    },
    {
      id: 'awesome-cve-poc',
      name: 'Awesome CVE PoC',
      description: 'CVE proof-of-concept collection',
      url: 'https://github.com/qazbnm456/awesome-cve-poc',
      category: ARSENAL_CATEGORIES.OFFENSIVE,
      priority: 'high'
    },
    {
      id: 'trickest-cve',
      name: 'Trickest CVE',
      description: 'CVE database with PoCs',
      url: 'https://github.com/trickest/cve',
      category: ARSENAL_CATEGORIES.OFFENSIVE,
      priority: 'high'
    },
    {
      id: 'awesome-exploit-development',
      name: 'Awesome Exploit Development',
      description: 'Exploit development resources',
      url: 'https://github.com/FabioBaroni/awesome-exploit-development',
      category: ARSENAL_CATEGORIES.OFFENSIVE,
      priority: 'high'
    },
    {
      id: 'linux-kernel-exploitation',
      name: 'Linux Kernel Exploitation',
      description: 'Linux kernel security and exploitation',
      url: 'https://github.com/xairy/linux-kernel-exploitation',
      category: ARSENAL_CATEGORIES.OFFENSIVE,
      priority: 'high'
    },
    {
      id: 'awesome-windows-exploitation',
      name: 'Awesome Windows Exploitation',
      description: 'Windows exploitation references',
      url: 'https://github.com/yeyintminthuhtut/Awesome-Advanced-Windows-Exploitation-References',
      category: ARSENAL_CATEGORIES.OFFENSIVE,
      priority: 'high'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // REVERSE ENGINEERING
  // ═══════════════════════════════════════════════════════════════════════════
  reversing: [
    {
      id: 'awesome-reversing',
      name: 'Awesome Reversing',
      description: 'Reverse engineering resources',
      url: 'https://github.com/fdivrp/awesome-reversing',
      category: ARSENAL_CATEGORIES.FORENSICS,
      priority: 'high'
    },
    {
      id: 're-reading-list',
      name: 'RE Reading List',
      description: 'Reverse engineering reading list',
      url: 'https://github.com/onethawt/reverseengineering-reading-list',
      category: ARSENAL_CATEGORIES.FORENSICS,
      priority: 'medium'
    },
    {
      id: 'awesome-static-analysis',
      name: 'Awesome Static Analysis',
      description: 'Static analysis tools for code security',
      url: 'https://github.com/mre/awesome-static-analysis',
      category: ARSENAL_CATEGORIES.DEFENSIVE,
      priority: 'high'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // OSINT
  // ═══════════════════════════════════════════════════════════════════════════
  osint: [
    {
      id: 'awesome-osint',
      name: 'Awesome OSINT',
      description: 'Open Source Intelligence resources',
      url: 'https://github.com/jivoi/awesome-osint',
      category: ARSENAL_CATEGORIES.OSINT,
      priority: 'critical'
    },
    {
      id: 'awesome-asset-discovery',
      name: 'Awesome Asset Discovery',
      description: 'Asset discovery and reconnaissance',
      url: 'https://github.com/redhuntlabs/Awesome-Asset-Discovery',
      category: ARSENAL_CATEGORIES.OSINT,
      priority: 'high'
    },
    {
      id: 'awesome-social-engineering',
      name: 'Awesome Social Engineering',
      description: 'Social engineering resources',
      url: 'https://github.com/v2-dev/awesome-social-engineering',
      category: ARSENAL_CATEGORIES.OSINT,
      priority: 'medium'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // MOBILE SECURITY
  // ═══════════════════════════════════════════════════════════════════════════
  mobile: [
    {
      id: 'awesome-android-security',
      name: 'Awesome Android Security',
      description: 'Android security resources and tools',
      url: 'https://github.com/ashishb/android-security-awesome',
      category: ARSENAL_CATEGORIES.MOBILE,
      priority: 'high'
    },
    {
      id: 'awesome-ios-security',
      name: 'Awesome iOS/macOS Security',
      description: 'iOS and macOS security resources',
      url: 'https://github.com/ashishb/osx-and-ios-security-awesome',
      category: ARSENAL_CATEGORIES.MOBILE,
      priority: 'high'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // NETWORK & WIRELESS
  // ═══════════════════════════════════════════════════════════════════════════
  network: [
    {
      id: 'awesome-pcaptools',
      name: 'Awesome PCAP Tools',
      description: 'Packet capture and analysis tools',
      url: 'https://github.com/caesar0301/awesome-pcaptools',
      category: ARSENAL_CATEGORIES.NETWORK,
      priority: 'high'
    },
    {
      id: 'wifi-arsenal',
      name: 'WiFi Arsenal',
      description: 'WiFi hacking tools and resources',
      url: 'https://github.com/0x90/wifi-arsenal',
      category: ARSENAL_CATEGORIES.NETWORK,
      priority: 'high'
    },
    {
      id: 'awesome-rtc-hacking',
      name: 'Awesome RTC Hacking',
      description: 'Real-Time Communications security',
      url: 'https://github.com/EnableSecurity/awesome-rtc-hacking',
      category: ARSENAL_CATEGORIES.NETWORK,
      priority: 'medium'
    },
    {
      id: 'awesome-cellular-hacking',
      name: 'Awesome Cellular Hacking',
      description: 'Cellular/mobile network security',
      url: 'https://github.com/W00t3k/Awesome-Cellular-Hacking',
      category: ARSENAL_CATEGORIES.NETWORK,
      priority: 'medium'
    },
    {
      id: 'rfsec-toolkit',
      name: 'RFSec ToolKit',
      description: 'Radio frequency security tools',
      url: 'https://github.com/cn0xroot/RFSec-ToolKit',
      category: ARSENAL_CATEGORIES.NETWORK,
      priority: 'medium'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // IoT & EMBEDDED
  // ═══════════════════════════════════════════════════════════════════════════
  iot: [
    {
      id: 'awesome-iot-hacks',
      name: 'Awesome IoT Hacks',
      description: 'IoT security and hacking resources',
      url: 'https://github.com/nebgnahz/awesome-iot-hacks',
      category: ARSENAL_CATEGORIES.IOT,
      priority: 'high'
    },
    {
      id: 'awesome-embedded-iot-security',
      name: 'Awesome Embedded & IoT Security',
      description: 'Embedded systems and IoT security',
      url: 'https://github.com/fkie-cad/awesome-embedded-and-iot-security',
      category: ARSENAL_CATEGORIES.IOT,
      priority: 'high'
    },
    {
      id: 'awesome-vehicle-security',
      name: 'Awesome Vehicle Security',
      description: 'Automotive and vehicle security',
      url: 'https://github.com/jaredthecoder/awesome-vehicle-security',
      category: ARSENAL_CATEGORIES.IOT,
      priority: 'high'
    },
    {
      id: 'awesome-ics-security',
      name: 'Awesome ICS Security',
      description: 'Industrial Control System security',
      url: 'https://github.com/hslatman/awesome-industrial-control-system-security',
      category: ARSENAL_CATEGORIES.IOT,
      priority: 'high'
    },
    {
      id: 'awesome-mainframe-hacking',
      name: 'Awesome Mainframe Hacking',
      description: 'Mainframe security and hacking',
      url: 'https://github.com/samanL33T/Awesome-Mainframe-Hacking',
      category: ARSENAL_CATEGORIES.IOT,
      priority: 'medium'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // FUZZING
  // ═══════════════════════════════════════════════════════════════════════════
  fuzzing: [
    {
      id: 'awesome-fuzzing',
      name: 'Awesome Fuzzing',
      description: 'Fuzzing resources and tools',
      url: 'https://github.com/secfigo/Awesome-Fuzzing',
      category: ARSENAL_CATEGORIES.OFFENSIVE,
      priority: 'high'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // AI & MACHINE LEARNING SECURITY
  // ═══════════════════════════════════════════════════════════════════════════
  aiSecurity: [
    {
      id: 'awesome-ai-security',
      name: 'Awesome AI Security',
      description: 'AI and ML security resources',
      url: 'https://github.com/RandomAdversary/Awesome-AI-Security',
      category: ARSENAL_CATEGORIES.AI_SECURITY,
      priority: 'high'
    },
    {
      id: 'awesome-adversarial-ml',
      name: 'Awesome Adversarial Machine Learning',
      description: 'Adversarial ML attacks and defenses',
      url: 'https://github.com/yenchenlin/awesome-adversarial-machine-learning',
      category: ARSENAL_CATEGORIES.AI_SECURITY,
      priority: 'high'
    },
    {
      id: 'awesome-ml-cybersecurity',
      name: 'Awesome ML for Cybersecurity',
      description: 'Machine learning for security',
      url: 'https://github.com/jivoi/awesome-ml-for-cybersecurity',
      category: ARSENAL_CATEGORIES.AI_SECURITY,
      priority: 'high'
    },
    {
      id: 'awesome-rl-cybersecurity',
      name: 'Awesome RL for Cybersecurity',
      description: 'Reinforcement learning for security',
      url: 'https://github.com/Limmen/awesome-rl-for-cybersecurity',
      category: ARSENAL_CATEGORIES.AI_SECURITY,
      priority: 'medium'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // CRYPTOGRAPHY
  // ═══════════════════════════════════════════════════════════════════════════
  crypto: [
    {
      id: 'awesome-cryptography',
      name: 'Awesome Cryptography',
      description: 'Cryptography resources and libraries',
      url: 'https://github.com/sobolevn/awesome-cryptography',
      category: ARSENAL_CATEGORIES.CRYPTO,
      priority: 'high'
    },
    {
      id: 'awesome-lockpicking',
      name: 'Awesome Lockpicking',
      description: 'Physical security and lockpicking',
      url: 'https://github.com/meitar/awesome-lockpicking',
      category: ARSENAL_CATEGORIES.OFFENSIVE,
      priority: 'medium'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // CTF & TRAINING
  // ═══════════════════════════════════════════════════════════════════════════
  ctf: [
    {
      id: 'ctf-tool',
      name: 'CTF Tool',
      description: 'CTF challenge tools and resources',
      url: 'https://github.com/SandySekharan/CTF-tool',
      category: ARSENAL_CATEGORIES.CTF,
      priority: 'high'
    },
    {
      id: 'awesome-cyber-skills',
      name: 'Awesome Cyber Skills',
      description: 'Cyber security training platforms',
      url: 'https://github.com/joe-shenouda/awesome-cyber-skills',
      category: ARSENAL_CATEGORIES.TRAINING,
      priority: 'high'
    },
    {
      id: 'gray-hacker-resources',
      name: 'Gray Hacker Resources',
      description: 'CTF and hacking resources',
      url: 'https://github.com/bt3gl/Gray-Hacker-Resources',
      category: ARSENAL_CATEGORIES.CTF,
      priority: 'medium'
    },
    {
      id: 'free-programming-books',
      name: 'Free Programming Books',
      description: 'Free programming and security ebooks',
      url: 'https://github.com/EbookFoundation/free-programming-books',
      category: ARSENAL_CATEGORIES.TRAINING,
      priority: 'high'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERENCE & TALKS
  // ═══════════════════════════════════════════════════════════════════════════
  reference: [
    {
      id: 'awesome-infosec',
      name: 'Awesome InfoSec',
      description: 'Information security resources',
      url: 'https://github.com/onlurking/awesome-infosec',
      category: ARSENAL_CATEGORIES.TRAINING,
      priority: 'high'
    },
    {
      id: 'infosec-reference',
      name: 'InfoSec Reference',
      description: 'Comprehensive security reference',
      url: 'https://github.com/rmusser01/Infosec_Reference',
      category: ARSENAL_CATEGORIES.TRAINING,
      priority: 'high'
    },
    {
      id: 'infosec-getting-started',
      name: 'InfoSec Getting Started',
      description: 'Beginners guide to information security',
      url: 'https://github.com/gradiuscypher/infosec_getting_started',
      category: ARSENAL_CATEGORIES.TRAINING,
      priority: 'high'
    },
    {
      id: 'awesome-sec-talks',
      name: 'Awesome Security Talks',
      description: 'Security conference talks',
      url: 'https://github.com/PaulSec/awesome-sec-talks',
      category: ARSENAL_CATEGORIES.TRAINING,
      priority: 'medium'
    },
    {
      id: 'fuzzysecurity-resources',
      name: 'FuzzySecurity Resource List',
      description: 'Security resources compilation',
      url: 'https://github.com/FuzzySecurity/Resource-List',
      category: ARSENAL_CATEGORIES.TRAINING,
      priority: 'medium'
    },
    {
      id: 'wordlists',
      name: 'Wordlists',
      description: 'Password and fuzzing wordlists',
      url: 'https://github.com/berzerk0/Probable-Wordlists',
      category: ARSENAL_CATEGORIES.PAYLOADS,
      priority: 'high'
    },
    {
      id: 'payloads',
      name: 'Payloads',
      description: 'Web attack payloads',
      url: 'https://github.com/foospidy/payloads',
      category: ARSENAL_CATEGORIES.PAYLOADS,
      priority: 'medium'
    },
    {
      id: 'awesome-shell',
      name: 'Awesome Shell',
      description: 'Shell scripting resources',
      url: 'https://github.com/alebcay/awesome-shell',
      category: ARSENAL_CATEGORIES.TOOLS,
      priority: 'medium'
    }
  ]
};

/**
 * HEREV — The Security Arsenal
 */
export class Herev {
  #config;
  #cache;
  #stats;

  constructor(config = {}) {
    this.#config = {
      enableCaching: config.enableCaching ?? true,
      cacheDir: config.cacheDir || './data/arsenal',
      ...config
    };
    this.#cache = new Map();
    this.#stats = {
      totalResources: 0,
      byCategory: {},
      byCriticality: { critical: 0, high: 0, medium: 0, low: 0 }
    };
    this.#computeStats();
    log.info('HEREV Arsenal initialized', {
      totalResources: this.#stats.totalResources,
      categories: Object.keys(this.#stats.byCategory).length
    });
  }

  /**
   * Compute arsenal statistics
   */
  #computeStats() {
    let total = 0;
    for (const [section, resources] of Object.entries(SECURITY_ARSENAL)) {
      for (const resource of resources) {
        total++;
        // Category stats
        const cat = resource.category || 'uncategorized';
        this.#stats.byCategory[cat] = (this.#stats.byCategory[cat] || 0) + 1;
        // Priority stats
        const priority = resource.priority || 'medium';
        this.#stats.byCriticality[priority] = (this.#stats.byCriticality[priority] || 0) + 1;
      }
    }
    this.#stats.totalResources = total;
  }

  /**
   * Get all resources
   */
  getAll() {
    return SECURITY_ARSENAL;
  }

  /**
   * Get resources by category
   */
  getByCategory(category) {
    const results = [];
    for (const resources of Object.values(SECURITY_ARSENAL)) {
      for (const resource of resources) {
        if (resource.category === category) {
          results.push(resource);
        }
      }
    }
    return results;
  }

  /**
   * Get resources by priority
   */
  getByPriority(priority) {
    const results = [];
    for (const resources of Object.values(SECURITY_ARSENAL)) {
      for (const resource of resources) {
        if (resource.priority === priority) {
          results.push(resource);
        }
      }
    }
    return results;
  }

  /**
   * Get critical resources only
   */
  getCritical() {
    return this.getByPriority('critical');
  }

  /**
   * Search arsenal by keyword
   */
  search(query) {
    const q = query.toLowerCase();
    const results = [];
    for (const resources of Object.values(SECURITY_ARSENAL)) {
      for (const resource of resources) {
        if (
          resource.name.toLowerCase().includes(q) ||
          resource.description.toLowerCase().includes(q) ||
          resource.id.includes(q)
        ) {
          results.push(resource);
        }
      }
    }
    return results;
  }

  /**
   * Get section by name
   */
  getSection(sectionName) {
    return SECURITY_ARSENAL[sectionName] || [];
  }

  /**
   * Get all section names
   */
  getSectionNames() {
    return Object.keys(SECURITY_ARSENAL);
  }

  /**
   * Get statistics
   */
  getStats() {
    return { ...this.#stats };
  }

  /**
   * Get category constants
   */
  getCategories() {
    return { ...ARSENAL_CATEGORIES };
  }

  /**
   * Export arsenal as JSON
   */
  exportJSON() {
    return JSON.stringify({
      version: '1.0.0',
      generated: new Date().toISOString(),
      stats: this.#stats,
      categories: ARSENAL_CATEGORIES,
      arsenal: SECURITY_ARSENAL
    }, null, 2);
  }

  /**
   * Generate markdown documentation
   */
  generateMarkdown() {
    let md = `# HEREV Security Arsenal\n\n`;
    md += `> The blade that guards the GENESIS realm\n\n`;
    md += `**Total Resources:** ${this.#stats.totalResources}\n\n`;
    md += `## Categories\n\n`;

    for (const [cat, count] of Object.entries(this.#stats.byCategory)) {
      md += `- **${cat}**: ${count} resources\n`;
    }

    md += `\n## Resources by Section\n\n`;

    for (const [section, resources] of Object.entries(SECURITY_ARSENAL)) {
      md += `### ${section.charAt(0).toUpperCase() + section.slice(1)}\n\n`;
      for (const resource of resources) {
        const priority = resource.priority === 'critical' ? ' :rotating_light:' :
                        resource.priority === 'high' ? ' :warning:' : '';
        md += `- [${resource.name}](${resource.url})${priority}\n`;
        md += `  ${resource.description}\n\n`;
      }
    }

    return md;
  }

  /**
   * Get diagnostic info
   */
  diagnostics() {
    return {
      module: 'HEREV',
      version: '1.0.0',
      status: 'operational',
      stats: this.#stats,
      config: this.#config,
      cacheSize: this.#cache.size
    };
  }
}

// Export singleton instance
export const herev = new Herev();

// Export categories for external use
export { ARSENAL_CATEGORIES, SECURITY_ARSENAL };

export default Herev;
