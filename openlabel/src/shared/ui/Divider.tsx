import { View } from 'react-native';
import { cn } from '@/shared/utils/cn';

export function Divider({ className }: { className?: string }) {
  return <View className={cn('h-px w-full bg-hairline', className)} />;
}
