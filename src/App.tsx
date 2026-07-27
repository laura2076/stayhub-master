import { InspectorPanel } from './components/InspectorPanel';
import { PensionSidebar } from './components/PensionSidebar';
import { PropertyHeader } from './components/PropertyHeader';
import { Toast } from './components/Toast';
import { TopBar } from './components/TopBar';
import { BulkEditModal } from './components/modals/BulkEditModal';
import { CascadeModal } from './components/modals/CascadeModal';
import { NewRoomModal } from './components/modals/NewRoomModal';
import { ValueEditorModal } from './components/modals/ValueEditorModal';
import { BlocksTab } from './components/tabs/BlocksTab';
import { ChannelsTab } from './components/tabs/ChannelsTab';
import { FaqTab } from './components/tabs/FaqTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { OptionsTab } from './components/tabs/OptionsTab';
import { RoomsTab } from './components/tabs/RoomsTab';
import { useStore } from './state/store';

const App = () => {
  const { state } = useStore();

  return (
    <div
      style={{
        minWidth: 1440,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--color-bg)',
      }}
    >
      <TopBar />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <PensionSidebar />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          <PropertyHeader />

          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {state.tab === 'rooms' ? <RoomsTab /> : null}
              {state.tab === 'blocks' ? <BlocksTab /> : null}
              {state.tab === 'options' ? <OptionsTab /> : null}
              {state.tab === 'channels' ? <ChannelsTab /> : null}
              {state.tab === 'faq' ? <FaqTab /> : null}
              {state.tab === 'history' ? <HistoryTab /> : null}
            </div>

            {state.settings.layout === '3panel' ? <InspectorPanel /> : null}
          </div>
        </div>
      </div>

      <BulkEditModal />
      <NewRoomModal />
      <CascadeModal />
      <ValueEditorModal />
      <Toast />
    </div>
  );
};

export default App;
