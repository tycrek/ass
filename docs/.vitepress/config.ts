import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "ass docs",
  description: "Documentation for ass, a ShareX server",
  cleanUrls: true,

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      {
        text: 'Install', items: [
          { text: 'Docker', link: '/install/docker' },
          { text: 'Local', link: '/install/local' }
        ]
      },
      { text: 'Configure', link: '/configure/' }
    ],

    sidebar: [
      {
        text: 'Install',
        link: '/install/',
        items: [
          { text: 'Docker', link: '/install/docker' },
          { text: 'Local', link: '/install/local' }
        ]
      },
      {
        text: 'Configure',
        link: '/configure/',
        items: [
          {
            text: 'SQL',
            link: '/configure/sql',
            items: [
              {
                text: 'MySQL',
                link: '/configure/sql/mysql'
              },
              {
                text: 'PostgreSQL',
                link: '/configure/sql/postgresql'
              }
            ]
          }
        ]
      },
      {
        text: 'Customize',
        link: '/customize/',
        items: [
          { text: 'Colors', link: '/customize/colors' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/tycrek/ass/' },
      { icon: 'discord', link: 'https://discord.gg/wGZYt5fasY' }
    ]
  }
})
