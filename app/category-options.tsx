'use client';
import {useUi} from './ui-language';
import {categories,categoryOptionLabel} from './categories';
export function CategoryOptions(){const {locale}=useUi();return categories.map(category=><option key={category} value={category}>{categoryOptionLabel(category,locale)}</option>);}
