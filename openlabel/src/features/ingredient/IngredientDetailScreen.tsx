import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { palette, VerdictTone } from '@/core/theme';
import {
  Card,
  Divider,
  Icon,
  IconName,
  ListRow,
  Pill,
  PillTone,
  PressableScale,
  Screen,
  Text,
} from '@/shared/ui';
import {
  categoryLabel,
  hasDossier,
  Ingredient,
  regionLabel,
  RegulatoryStatus,
  regulatoryStatusLabel,
  riskLabel,
  RiskLevel,
} from '@/domain/ingredients/types';
import { indiaRegulationFor } from '@/domain/ingredients';
import { useIngredient } from './hooks/useIngredient';

const RISK_TONE: Record<RiskLevel, VerdictTone> = {
  low: 'success',
  moderate: 'warning',
  high: 'danger',
};

const STATUS_TONE: Record<RegulatoryStatus, PillTone> = {
  permitted: 'success',
  permitted_with_limits: 'warning',
  restricted: 'warning',
  banned: 'danger',
  not_evaluated: 'neutral',
};

export function IngredientDetailScreen({ id }: { id?: string }) {
  const router = useRouter();
  const { data, isLoading } = useIngredient(id);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen scroll>
      <Header onBack={goBack} />
      {isLoading ? (
        <Centered text="Loading…" />
      ) : !data ? (
        <Centered text="Ingredient not found." />
      ) : (
        <Detail ingredient={data} />
      )}
    </Screen>
  );
}

function Detail({ ingredient }: { ingredient: Ingredient }) {
  const tone = RISK_TONE[ingredient.riskLevel];
  const code = ingredient.insNumber
    ? `E${ingredient.eNumber ?? ingredient.insNumber} · INS ${ingredient.insNumber}`
    : null;
  const dossier = hasDossier(ingredient);

  return (
    <View className="gap-4 pb-6">
      <View className="mt-1">
        <Text variant="hero" weight="bold" tracking={-0.5}>
          {ingredient.name}
        </Text>
        {code ? (
          <Text variant="body" tone="secondary" className="mt-1">
            {code}
          </Text>
        ) : null}
        <View className="flex-row flex-wrap gap-2 mt-4">
          <Pill label={riskLabel[ingredient.riskLevel]} tone={tone} />
          <Pill label={categoryLabel[ingredient.category]} tone="neutral" />
        </View>
      </View>

      <Section icon="flask" title="What it does">
        <Text variant="body" className="leading-6">
          {ingredient.purpose}
        </Text>
      </Section>

      {ingredient.scientificSummary ? (
        <Section icon="sparkle" title="What the science says">
          <Text variant="body" className="leading-6">
            {ingredient.scientificSummary}
          </Text>
        </Section>
      ) : null}

      <Section icon="shield" title="Regulatory status">
        {(() => {
          const india = indiaRegulationFor(ingredient);
          const otherRegs = (ingredient.regulations ?? []).filter((r) => r.region !== 'IN');
          if (!india && otherRegs.length === 0) {
            return (
              <Text variant="body" className="leading-6">
                {ingredient.regulatoryStatus ??
                  'Permitted as a regulated food additive in major markets.'}
              </Text>
            );
          }
          return (
            <View className="gap-3">
              {india ? (
                <RegRow
                  region="India (FSSAI)"
                  note={
                    india.note ||
                    (india.inferred ? 'Permitted under FSSAI — INS-listed additive' : undefined)
                  }
                  status={india.status}
                  emphasis
                />
              ) : null}
              {otherRegs.map((reg) => (
                <RegRow
                  key={reg.region}
                  region={regionLabel[reg.region]}
                  note={reg.note}
                  status={reg.status}
                />
              ))}
            </View>
          );
        })()}
      </Section>

      {ingredient.aliases.length > 0 ? (
        <Section icon="tag" title="Also known as">
          <View className="flex-row flex-wrap gap-2">
            {ingredient.aliases.map((alias) => (
              <View
                key={alias}
                className="px-3 py-1.5"
                style={{ backgroundColor: '#F0EFEA', borderRadius: 999 }}
              >
                <Text variant="secondary" weight="medium" style={{ color: palette.inkSecondary }}>
                  {alias}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {ingredient.references && ingredient.references.length > 0 ? (
        <Section icon="book" title="References">
          {ingredient.references.map((ref, i) => (
            <View key={ref.url}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                title={ref.label}
                subtitle={ref.url.replace(/^https?:\/\//, '')}
                onPress={() => Linking.openURL(ref.url).catch(() => undefined)}
              />
            </View>
          ))}
        </Section>
      ) : null}

      {!dossier ? (
        <View className="flex-row items-start gap-2 px-1">
          <Icon name="search" size={15} color={palette.inkTertiary} />
          <Text variant="caption" tone="tertiary" className="flex-1 leading-5">
            Identified from the INS additive registry. A full evidence dossier for this additive is
            on the way — the score above uses its category and risk level.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function RegRow({
  region,
  note,
  status,
  emphasis,
}: {
  region: string;
  note?: string;
  status: RegulatoryStatus;
  emphasis?: boolean;
}) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1">
        <Text variant="body" weight={emphasis ? 'semibold' : 'medium'}>
          {region}
        </Text>
        {note ? (
          <Text variant="caption" tone="tertiary" className="mt-0.5">
            {note}
          </Text>
        ) : null}
      </View>
      <Pill label={regulatoryStatusLabel[status]} tone={STATUS_TONE[status]} />
    </View>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card padded>
      <View className="flex-row items-center gap-2 mb-3">
        <Icon name={icon} size={18} color={palette.inkSecondary} />
        <Text variant="section" weight="semibold">
          {title}
        </Text>
      </View>
      {children}
    </Card>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-row items-center justify-between py-2 mb-1">
      <PressableScale
        haptic
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        className="items-center justify-center"
        style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: palette.surface }}
      >
        <Icon name="arrow-left" size={20} color={palette.ink} />
      </PressableScale>
      <Text variant="body" weight="semibold">
        Ingredient
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function Centered({ text }: { text: string }) {
  return (
    <View className="flex-1 items-center justify-center py-24">
      <Text variant="body" tone="secondary">
        {text}
      </Text>
    </View>
  );
}
