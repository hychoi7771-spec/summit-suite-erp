
ALTER TABLE public.design_review_comments
ADD COLUMN pin_x double precision DEFAULT NULL,
ADD COLUMN pin_y double precision DEFAULT NULL,
ADD COLUMN pin_image_index integer DEFAULT NULL;
