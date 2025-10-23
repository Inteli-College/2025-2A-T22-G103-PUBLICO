import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Chimera VMS - TCC Cybersecurity',
  tagline: 'Vulnerability Management System with Artificial Intelligence',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://esthernunes.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/2025-2A-T22-G103-PUBLICO/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'esthernunes', // Usually your GitHub org/user name.
  projectName: '2025-2A-T22-G103-PUBLICO', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Chimera VMS',
      logo: {
        alt: 'Chimera VMS Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tccSidebar',
          position: 'left',
          label: 'TCC',
        },
        {
          type: 'docSidebar',
          sidebarId: 'sprintsSidebar',
          position: 'left',
          label: 'Sprints',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          href: 'https://github.com/esthernunes/2025-2A-T22-G103-PUBLICO',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Introduction',
              to: '/docs/intro',
            },
            {
              label: 'Module 13 - Chimera VMS',
              to: '/docs/modulo13/index',
            },
            {
              label: 'Module 14 - PKI Authentication',
              to: '/docs/modulo14/intro',
            },
          ],
        },
        {
          title: 'Sprints',
          items: [
            {
              label: 'Module 13 Sprints',
              to: '/docs/modulo13/sprints/sprint-1/objetivos',
            },
            {
              label: 'Sprint Progress',
              to: '/docs/modulo13/sprints/sprint-1/objetivos',
            },
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/esthernunes/2025-2A-T22-G103-PUBLICO',
            },
            {
              label: 'QITech',
              href: 'https://qitech.com.br',
            },
            {
              label: 'Inteli',
              href: 'https://inteli.edu.br',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Esther Hikari - Chimera VMS TCC. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
