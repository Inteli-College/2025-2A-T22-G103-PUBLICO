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
        'modulo13/index',
        {
          type: 'category',
          label: 'Theoretical Foundation',
          items: [
            'modulo13/fundamentacao/cybersecurity',
            'modulo13/fundamentacao/vulnerability-management',
            'modulo13/fundamentacao/machine-learning',
          ],
        },
        {
          type: 'category',
          label: 'Methodology',
          items: [
            'modulo13/metodologia/index',
          ],
        },
        {
          type: 'category',
          label: 'Implementation',
          items: [
            'modulo13/implementacao/index',
          ],
        },
        {
          type: 'category',
          label: 'Results',
          items: [
            'modulo13/resultados/index',
          ],
        },
        {
          type: 'category',
          label: 'Conclusions',
          items: [
            'modulo13/conclusoes/index',
          ],
        },
        {
          type: 'category',
          label: 'Sprint Documentation',
          items: [
            'modulo13/sprints/sprint-1/objetivos',
            'modulo13/sprints/sprint-1/tarefas',
            'modulo13/sprints/sprint-1/entregaveis',
            'modulo13/sprints/sprint-2/objetivos',
            'modulo13/sprints/sprint-2/tarefas',
            'modulo13/sprints/sprint-2/entregaveis',
            'modulo13/sprints/sprint-3/objetivos',
            'modulo13/sprints/sprint-3/tarefas',
            'modulo13/sprints/sprint-3/entregaveis',
            'modulo13/sprints/sprint-4/objetivos',
            'modulo13/sprints/sprint-4/tarefas',
            'modulo13/sprints/sprint-4/entregaveis',
            'modulo13/sprints/sprint-5/objetivos',
            'modulo13/sprints/sprint-5/tarefas',
            'modulo13/sprints/sprint-5/entregaveis',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Module 14 - PKI Authentication Implementation',
      items: [
        'modulo14/index',
        'modulo14/intro',
        'modulo14/implementation',
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
      label: 'Module 13 - Sprint Documentation',
      items: [
        {
          type: 'category',
          label: 'Sprint 1 - Planejamento e Preparação',
          items: [
            'modulo13/sprints/sprint-1/objetivos',
            'modulo13/sprints/sprint-1/tarefas',
            'modulo13/sprints/sprint-1/entregaveis',
          ],
        },
        {
          type: 'category',
          label: 'Sprint 2 - Automação e Normalização',
          items: [
            'modulo13/sprints/sprint-2/objetivos',
            'modulo13/sprints/sprint-2/tarefas',
            'modulo13/sprints/sprint-2/entregaveis',
          ],
        },
        {
          type: 'category',
          label: 'Sprint 3 - Estruturação e Inserção',
          items: [
            'modulo13/sprints/sprint-3/objetivos',
            'modulo13/sprints/sprint-3/tarefas',
            'modulo13/sprints/sprint-3/entregaveis',
          ],
        },
        {
          type: 'category',
          label: 'Sprint 4 - Inteligência e Integração',
          items: [
            'modulo13/sprints/sprint-4/objetivos',
            'modulo13/sprints/sprint-4/tarefas',
            'modulo13/sprints/sprint-4/entregaveis',
          ],
        },
        {
          type: 'category',
          label: 'Sprint 5 - Visualização e Validação',
          items: [
            'modulo13/sprints/sprint-5/objetivos',
            'modulo13/sprints/sprint-5/tarefas',
            'modulo13/sprints/sprint-5/entregaveis',
          ],
        },
      ],
    },
  ],
};

export default sidebars;