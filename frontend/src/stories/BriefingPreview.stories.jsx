import BriefingPreview from '../components/BriefingPreview'
import '../components/BriefingPreview.css'

export default {
  title: 'Componentes/BriefingPreview',
  component: BriefingPreview,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

// Dados de exemplo completos
const sampleBriefingData = {
  client_name: 'João Silva',
  client_email: 'joao@exemplo.com',
  client_phone: '+55 11 98765-4321',
  city_state: 'São Paulo, SP',
  website: '@minhacafe',
  project_type: 'Novo projeto',
  deadline: 'Em 30 dias',
  extra_items: 'Cartão de visitas, Instagram',
  about_company: 'Cafeteria artesanal especializada em grãos selecionados do Brasil. Atuamos há 3 anos no mercado.',
  products_services: 'Café em grãos, café moído, bebidas quentes e frias',
  diferencial: 'Torra própria e grãos de produtores locais',
  mission_vision_values: 'Missão: Proporcionar experiências únicas. Visão: Ser referência em café artesanal.',
  main_objectives: 'Expandir para novas regiões e fortalecer presença digital',
  positioning: 'Marca sofisticada e acolhedora para apreciadores de café',
  keywords: 'Qualidade, Acolhimento, Artesanal',
  differentiation: 'Relacionamento direto com produtores e torra artesanal',
  personality_scales: {
    scale_sophisticated: '4',
    scale_technical: '2',
    scale_formal: '3',
    scale_traditional: '2',
    scale_exclusive: '4'
  },
  competitors: 'Starbucks, cafeterias locais',
  references: 'Blue Bottle, Intelligentsia',
  what_you_like: 'Design minimalista e foco na qualidade',
  preferred_colors: 'Preto, marrom café, dourado',
  excluded_colors: 'Rosa, roxo',
  logo_types: 'Minimalista com símbolo',
  font_preferences: 'Moderna e elegante',
  additional_info: 'Preferimos algo atemporal que transmita sofisticação'
}

// História 1: Preview Vazio (Início)
export const PreviewVazio = {
  args: {
    sessionData: {
      session_id: '123',
      client_name: 'Novo Cliente',
      progress: 0,
      is_completed: false,
    },
    briefingData: {},
    fallbackMode: false,
  },
}

// História 2: Preview Parcialmente Preenchido
export const PreviewParcial = {
  args: {
    sessionData: {
      session_id: '123',
      client_name: 'João Silva',
      progress: 35,
      is_completed: false,
    },
    briefingData: {
      client_name: 'João Silva',
      client_email: 'joao@exemplo.com',
      client_phone: '+55 11 98765-4321',
      about_company: 'Cafeteria artesanal especializada em grãos selecionados',
      preferred_colors: 'Preto, marrom, dourado',
    },
    fallbackMode: false,
  },
}

// História 3: Preview Completo (Pronto para Enviar)
export const PreviewCompleto = {
  args: {
    sessionData: {
      session_id: '123',
      client_name: 'João Silva',
      progress: 100,
      is_completed: false,
    },
    briefingData: sampleBriefingData,
    fallbackMode: false,
    onUpdate: (field, value) => {
      console.log(`Campo atualizado: ${field} = ${value}`)
    },
  },
}

// História 4: Preview Enviado com Sucesso
export const PreviewEnviado = {
  args: {
    sessionData: {
      session_id: '123',
      client_name: 'João Silva',
      progress: 100,
      is_completed: true,
    },
    briefingData: sampleBriefingData,
    fallbackMode: false,
  },
}

// História 5: Modo Fallback (Chat Offline)
export const ModoFallback = {
  args: {
    sessionData: {
      session_id: '123',
      client_name: 'Maria Santos',
      progress: 20,
      is_completed: false,
    },
    briefingData: {
      client_name: 'Maria Santos',
      client_email: 'maria@exemplo.com',
    },
    fallbackMode: true,
    onSave: async (data) => {
      console.log('Salvando dados:', data)
      alert('✅ Dados salvos com sucesso!')
      return Promise.resolve()
    },
  },
}

// História 6: Modo Fallback - Campos Obrigatórios Preenchidos
export const FallbackProntoEnviar = {
  args: {
    sessionData: {
      session_id: '123',
      client_name: 'Carlos Oliveira',
      progress: 60,
      is_completed: false,
    },
    briefingData: {
      client_name: 'Carlos Oliveira',
      client_email: 'carlos@exemplo.com',
      about_company: 'Loja de roupas sustentáveis',
      preferred_colors: 'Verde, bege, branco',
    },
    fallbackMode: true,
    onSave: async (data) => {
      console.log('Salvando:', data)
      return Promise.resolve()
    },
  },
}

// História 7: Preview com Escalas de Personalidade
export const PreviewComEscalas = {
  args: {
    sessionData: {
      session_id: '123',
      client_name: 'Ana Costa',
      progress: 75,
      is_completed: false,
    },
    briefingData: {
      client_name: 'Ana Costa',
      client_email: 'ana@exemplo.com',
      about_company: 'Marca de cosméticos naturais',
      keywords: 'Natural, Sustentável, Beleza',
      personality_scales: {
        scale_sophisticated: '4',
        scale_technical: '3',
        scale_formal: '2',
        scale_traditional: '1',
        scale_exclusive: '3'
      },
      preferred_colors: 'Verde, branco, dourado',
    },
    fallbackMode: false,
  },
}
