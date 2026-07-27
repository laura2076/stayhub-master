import type { Property, RoomInfo } from '../../domain/types';
import { Chip } from '../primitives';

/** 객실을 설명하는 값들. 속성 사전이 아니라 객실 자체에 붙어 있는 것이라 숙소가 무엇을
 *  갖든 똑같이 필요합니다. 만들 때와 고칠 때가 같은 화면이어야 하므로 한 곳에 둡니다.
 *
 *  구조·침구·면적은 자유 입력이되, 이 숙소에 이미 쓰는 값을 눌러 넣을 수 있게 합니다 —
 *  28실 중 27실이 "킹침대 1"인데 매번 타이핑할 이유가 없습니다. */
export const RoomInfoFields = ({
  p,
  value,
  floorText,
  onChange,
  onFloorText,
}: {
  p: Property;
  value: RoomInfo;
  floorText: string;
  onChange: (patch: Partial<RoomInfo>) => void;
  onFloorText: (v: string) => void;
}) => {
  const floors = [...new Set(p.rooms.map((r) => r.floor))].sort((a, b) => a - b);
  const seen = (pick: (r: Property['rooms'][number]) => string) =>
    [...new Set(p.rooms.map(pick))].filter(Boolean).slice(0, 5);

  const label = { fontSize: 11, fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: 7 } as const;

  const TextRow = ({
    title,
    v,
    choices,
    placeholder,
    onSet,
  }: {
    title: string;
    v: string;
    choices: string[];
    placeholder: string;
    onSet: (s: string) => void;
  }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={label}>{title}</div>
      <input
        className="input"
        value={v}
        placeholder={placeholder}
        onChange={(e) => onSet(e.target.value)}
        style={{ minHeight: 32, fontSize: 13 }}
      />
      {choices.length ? (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
          {choices.map((c) => (
            <Chip key={c} label={c} padding="4px 9px" on={v === c} onClick={() => onSet(c)} />
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="field" style={{ marginBottom: 14 }}>
        <label>객실명</label>
        <input
          className="input"
          value={value.name}
          placeholder="예: A801"
          onChange={(e) => onChange({ name: e.target.value })}
          style={{ minHeight: 32, fontSize: 13 }}
        />
      </div>

      <div style={label}>층</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {floors.map((f) => (
          <Chip key={f} label={`${f}층`} padding="7px 13px" on={floorText === String(f)} onClick={() => onFloorText(String(f))} />
        ))}
        <input
          className="input"
          type="number"
          min={1}
          value={floorText}
          onChange={(e) => onFloorText(e.target.value)}
          style={{ width: 74, minHeight: 30, fontSize: 13, textAlign: 'right' }}
          title="목록에 없는 층은 직접 넣으세요"
        />
      </div>

      <TextRow
        title="면적"
        v={value.area}
        placeholder="예: 59.50㎡ (18평)"
        choices={seen((r) => r.area)}
        onSet={(area) => onChange({ area })}
      />
      <TextRow title="구조" v={value.form} placeholder="예: 원룸형" choices={seen((r) => r.form)} onSet={(form) => onChange({ form })} />
      <TextRow title="침구" v={value.bed} placeholder="예: 킹침대 1" choices={seen((r) => r.bed)} onSet={(bed) => onChange({ bed })} />
      <TextRow title="특징" v={value.tag} placeholder="예: 오션뷰,개별테라스" choices={seen((r) => r.tag)} onSet={(tag) => onChange({ tag })} />
    </>
  );
};
