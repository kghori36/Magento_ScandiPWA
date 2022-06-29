/**
 * ScandiPWA - Progressive Web App for Magento
 *
 * Copyright © Scandiweb, Inc. All rights reserved.
 * See LICENSE for license details.
 *
 * @license OSL-3.0 (Open Software License ("OSL") v. 3.0)
 * @package scandipwa/base-theme
 * @link https://github.com/scandipwa/base-theme
 */

import PropTypes from 'prop-types';
import { PureComponent } from 'react';
import { withRouter } from 'react-router-dom';

import ProductCard from 'Component/ProductCard';
import { GRID_LAYOUT } from 'Route/CategoryPage/CategoryPage.config';
import { FilterType } from 'Type/Category.type';
import { MixType } from 'Type/Common.type';
import { ProductType } from 'Type/ProductList.type';
import { noopFn } from '../../util/Common';
import media, { PRODUCT_MEDIA } from '../../util/Media';

import { DEFAULT_PLACEHOLDER_COUNT } from './ProductListPage.config';

import './ProductListPage.style';

/**
 * Placeholder for List of category product
 * @class ProductListPage
 * @namespace Component/ProductListPage/Component
 */
export class ProductListPage extends PureComponent {
    static propTypes = {
        isInfiniteLoaderEnabled: PropTypes.bool.isRequired,
        isLoading: PropTypes.bool.isRequired,
        isVisible: PropTypes.bool.isRequired,
        updatePages: PropTypes.func.isRequired,
        numberOfPlaceholders: PropTypes.number,
        selectedFilters: FilterType,
        wrapperRef: PropTypes.func,
        pageNumber: PropTypes.number,
        items: PropTypes.arrayOf(ProductType),
        mix: MixType
    };

    static defaultProps = {
        numberOfPlaceholders: DEFAULT_PLACEHOLDER_COUNT,
        wrapperRef: noopFn,
        selectedFilters: {},
        pageNumber: null,
        items: [],
        mix: {}
    };

    state = {
        siblingsHaveBrands: false,
        siblingsHavePriceBadge: false,
        siblingsHaveTierPrice: false,
        siblingsHaveConfigurableOptions: false
    };

    componentDidMount() {
        this.startObserving();
    }

    componentDidUpdate() {
        this.startObserving();
    }

    componentWillUnmount() {
        this.stopObserving();
    }

    containerProps() {
        const {
            siblingsHaveBrands,
            siblingsHavePriceBadge,
            siblingsHaveTierPrice,
            siblingsHaveConfigurableOptions
        } = this.state;

        return {
            productCardFunctions: {
                setSiblingsHaveBrands: () => this.setState({ siblingsHaveBrands: true }),
                setSiblingsHavePriceBadge: () => this.setState({ siblingsHavePriceBadge: true }),
                setSiblingsHaveTierPrice: () => this.setState({ siblingsHaveTierPrice: true }),
                setSiblingsHaveConfigurableOptions: () => this.setState({ siblingsHaveConfigurableOptions: true })
            },
            productCardProps: {
                siblingsHaveBrands,
                siblingsHavePriceBadge,
                siblingsHaveTierPrice,
                siblingsHaveConfigurableOptions
            }
        };
    }

    startObserving() {
        const {
            items,
            updatePages,
            isInfiniteLoaderEnabled
        } = this.props;

        if (!isInfiniteLoaderEnabled || items.length) {
            return;
        }

        if (this.node && !this.observer && 'IntersectionObserver' in window) {
            const options = {
                rootMargin: '0px',
                threshold: 0.1
            };

            this.observer = new IntersectionObserver(([{ intersectionRatio }]) => {
                const {
                    items,
                    isLoading
                } = this.props;

                // must not be a product items list, and must not be loading
                if (intersectionRatio > 0 && !items.length && !isLoading) {
                    this.stopObserving();
                    updatePages();
                }
            }, options);

            this.observer.observe(this.node);
        }
    }

    stopObserving() {
        if (this.observer) {
            if (this.observer.unobserve && this.node) {
                this.observer.unobserve(this.node);
            }

            if (this.observer.disconnect) {
                this.observer.disconnect();
            }

            this.observer = null;
        }
    }

    renderPlaceholders() {
        const {
            numberOfPlaceholders,
            mix: {
                mods: {
                    layout = GRID_LAYOUT
                } = {}
            }
        } = this.props;

        return Array.from(
            { length: numberOfPlaceholders },
            (_, i) => (
                <ProductCard
                    key={i}
                    product={{}}
                    layout={layout}
                />
            )
        );
    }

    getPlaceholderRef() {
        const { isVisible } = this.props;

        if (!isVisible) {
            return undefined;
        }

        return (node) => {
            this.node = node;
        };
    }

    createPrice(price) {
        const price_range = {
            maximum_price: {
                default_final_price: {
                    currency: 'EUR',
                    value: price
                },
                default_final_price_excl_tax: {
                    currency: 'EUR',
                    value: price
                },
                default_price: {
                    currency: 'EUR',
                    value: 0
                },
                discount: {
                    amount_off: 0,
                    percent_off: 0
                },
                final_price: {
                    currency: 'EUR',
                    value: price
                },
                final_price_excl_tax: {
                    currency: 'EUR',
                    value: price
                },
                regular_price: {
                    currency: 'EUR',
                    value: price
                },
                regular_price_excl_tax: {
                    currency: 'EUR',
                    value: price
                }
            }
            ,
            minimum_price: {
                default_final_price: {
                    currency: 'EUR',
                    value: price
                },
                default_final_price_excl_tax: {
                    currency: 'EUR',
                    value: price
                },
                default_price: {
                    currency: 'EUR',
                    value: 0
                },
                discount: {
                    amount_off: 0,
                    percent_off: 0
                },
                final_price: {
                    currency: 'EUR',
                    value: price
                },
                final_price_excl_tax: {
                    currency: 'EUR',
                    value: price
                },
                regular_price: {
                    currency: 'EUR',
                    value: price
                },
                regular_price_excl_tax: {
                    currency: 'EUR',
                    value: price
                }
            }
        };
        return price_range;
    }

    renderPageItems() {
        const {
            items,
            selectedFilters,
            mix: {
                mods: {
                    layout = GRID_LAYOUT
                } = {}
            }
        } = this.props;

        return items.map((product, i) => {
            const {
                type_id,
                variants,
                thumbnail,
                price_range,
                small_image
            } = product;

            const windowUrl = window.location.search;
            const urlParams = new URLSearchParams(windowUrl);
            const customFilters = urlParams.get('customFilters');

            return type_id === 'configurable' ?
                variants.map((variant, x) => {
                    const foundProduct = product.variants.find(productVariant => productVariant.id == variant.id);
                    const priceCreated = this.createPrice(foundProduct.price_range.maximum_price.final_price.value);
                    const price_range = priceCreated;
                    const {
                        sku,
                        name,
                        price
                    } = variant;
                    const newProduct = {
                        ...product,
                        sku,
                        name,
                        thumbnail,
                        small_image: {
                            url: media(variant.attributes['thumbnail'].attribute_value, PRODUCT_MEDIA)
                        },
                        price_range
                    };

                    if (customFilters) {
                        const colorName = customFilters.replace('color_name:', '');
                        if (variant.attributes['color_name']) {
                            let ire = 0;
                            const colors = colorName.split(',');
                            const matchedColor = colors.find(color => color == variant.attributes['color_name'].attribute_value);
                            if (!matchedColor) {
                                return;
                            }

                        }
                    }
                    // const productPrice = product.price_range.maximum_price.final_price.value;
                    // console.log(productPrice)
                    // product.price_range = this.createPrice(productPrice);

                    console.log();
                    return (
                        <ProductCard
                            configurableVariantIndex={x}
                            product={newProduct}
                            // eslint-disable-next-line react/no-array-index-key
                            key={x}
                            selectedFilters={selectedFilters}
                            layout={layout}
                            {...this.containerProps()}
                        />
                    );
                })
                :
                <ProductCard
                    product={product}
                    // eslint-disable-next-line react/no-array-index-key
                    key={i}
                    selectedFilters={selectedFilters}
                    layout={layout}
                    {...this.containerProps()}
                />;
        });
    }

    renderPlaceholderItems() {
        return (
            <>
                <li
                    block="ProductListPage"
                    elem="Offset"
                    ref={this.getPlaceholderRef()}
                />
                {this.renderPlaceholders()}
            </>
        );
    }

    renderItems() {
        const {
            items,
            isLoading
        } = this.props;

        if (!items.length || isLoading) {
            return this.renderPlaceholderItems();
        }

        return this.renderPageItems();
    }

    render() {
        const {
            pageNumber,
            wrapperRef,
            mix
        } = this.props;

        return (
            <ul
                block="ProductListPage"
                mix={{
                    ...mix,
                    elem: 'Page'
                }}
                key={pageNumber}
                ref={wrapperRef}
            >
                {this.renderItems()}
            </ul>
        );
    }
}

export default withRouter(ProductListPage);
