import { Component } from 'react';
import { Card } from '@/components/ui/card';
import { WidgetError } from './WidgetStates';

/** Un boundary por celda: si un widget rompe, el resto de la grilla sigue andando. */
export default class WidgetErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.reset = () => this.setState({ error: null });
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(`[widgets] "${this.props.widgetId}" falló al renderizar`, error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Card className="h-full justify-center">
        <WidgetError message={this.props.message || 'Esta tarjeta tuvo un problema.'} onRetry={this.reset} />
      </Card>
    );
  }
}
