import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // Sidebar para documentação do TCC
  tccSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Module 13 - Chimera VMS Development',
      items: [
        {
          type: 'category',
          label: 'Theoretical Foundation',
          items: [
            'fundamentacao/cybersecurity',
            'fundamentacao/vulnerability-management',
            'fundamentacao/machine-learning',
          ],
        },
        {
          type: 'category',
          label: 'Methodology',
          items: [
            'metodologia/index',
          ],
        },
        {
          type: 'category',
          label: 'Implementation',
          items: [
            'implementacao/index',
          ],
        },
        {
          type: 'category',
          label: 'Results',
          items: [
            'resultados/index',
          ],
        },
        {
          type: 'category',
          label: 'Conclusions',
          items: [
            'conclusoes/index',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Module 14 - Future Work',
      items: [
        'modulo14/index',
        'modulo14/intro',
        'modulo14/roadmap',
        'modulo14/research',
        'modulo14/expansion',
      ],
    },
  ],

  // Sidebar para documentação das Sprints
  sprintsSidebar: [
    {
      type: 'category',
      label: 'Sprint 1 - Planejamento e Preparação',
      items: [
        'sprints/sprint-1/objetivos',
        'sprints/sprint-1/tarefas',
        'sprints/sprint-1/entregaveis',
        // 'sprints/sprint-1/retrospectiva',
      ],
    },
    {
      type: 'category',
      label: 'Sprint 2 - Automação e Normalização',
      items: [
        'sprints/sprint-2/objetivos',
        'sprints/sprint-2/tarefas',
        'sprints/sprint-2/entregaveis',
        // 'sprints/sprint-2/retrospectiva',
      ],
    },
    {
      type: 'category',
      label: 'Sprint 3 - Estruturação e Inserção',
      items: [
        'sprints/sprint-3/objetivos',
        'sprints/sprint-3/tarefas',
        'sprints/sprint-3/entregaveis',
        // 'sprints/sprint-3/retrospectiva',
      ],
    },
    {
      type: 'category',
      label: 'Sprint 4 - Inteligência e Integração',
      items: [
        'sprints/sprint-4/objetivos',
        'sprints/sprint-4/tarefas',
        'sprints/sprint-4/entregaveis',
        // 'sprints/sprint-4/retrospectiva',
      ],
    },
    // {
    //   type: 'category',
    //   label: 'Sprint 5 - Visualização e Validação',
    //   items: [
    //     'sprints/sprint-5/objetivos',
    //     'sprints/sprint-5/tarefas',
    //     'sprints/sprint-5/entregaveis',
    //     'sprints/sprint-5/retrospectiva',
    //   ],
    // },
  ],
};

export default sidebars;