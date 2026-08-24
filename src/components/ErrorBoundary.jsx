import { Component } from 'react';

/* Sem isto, um throw em qualquer componente derruba a árvore inteira e o
   usuário fica com uma página em branco sem explicação nenhuma. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { falhou: false };
  }

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  componentDidCatch(error, info) {
    console.error('Falha ao renderizar a interface.', error, info);
  }

  render() {
    if (this.state.falhou) return this.props.fallback ?? null;
    return this.props.children;
  }
}
