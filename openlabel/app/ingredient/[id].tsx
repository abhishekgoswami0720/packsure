import { useLocalSearchParams } from 'expo-router';
import { IngredientDetailScreen } from '@/features/ingredient';

export default function IngredientRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <IngredientDetailScreen id={id} />;
}
